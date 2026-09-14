import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import type { MonnifyBillPaymentProvider } from "./monnify-bill-payment-provider.js";
import type { ApprovalConsumptionGateway } from "./tenant-admin-provider-gateway.js";

type Draft = {
  categoryCode: string;
  categoryName: string;
  category: string;
  billerCode: string;
  billerName: string;
  productCode: string;
  productName: string;
  description?: string;
  denominationType: "FIXED" | "VARIABLE";
  amount?: string;
  minAmount?: string;
  maxAmount?: string;
  source: Record<string, unknown>;
};

export class BillCatalogueService {
  public constructor(
    private readonly db: Knex,
    private readonly monnify: Pick<
      MonnifyBillPaymentProvider,
      "categories" | "billers" | "products"
    >,
    private readonly approvals: ApprovalConsumptionGateway,
  ) {}

  public async importDraft(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
  }) {
    const requestHash = hash({ provider: "MONNIFY" });
    const existing = await this.tenant(input.tenantId, (tx) =>
      tx("bill_catalogue_imports")
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        })
        .first(),
    );
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new Error("IDEMPOTENCY_KEY_REUSED");
      return importView(existing, true);
    }
    const importId = randomUUID();
    await this.tenant(input.tenantId, (tx) =>
      tx("bill_catalogue_imports").insert({
        id: importId,
        tenant_id: input.tenantId,
        provider_code: "MONNIFY",
        status: "IMPORTING",
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        started_by: input.actorId,
      }),
    );
    try {
      const drafts = await this.discover();
      if (drafts.length === 0) throw new Error("MONNIFY_CATALOGUE_EMPTY");
      const sourceHash = hash(drafts.map((item) => item.source));
      const categories = new Set(drafts.map((item) => item.categoryCode)).size;
      await this.tenant(input.tenantId, async (tx) => {
        await tx("bill_catalogue_import_items").insert(
          drafts.map((item) => ({
            id: randomUUID(),
            tenant_id: input.tenantId,
            import_id: importId,
            category_code: item.categoryCode,
            category_name: item.categoryName,
            category: item.category,
            biller_code: item.billerCode,
            biller_name: item.billerName,
            product_code: item.productCode,
            product_name: item.productName,
            description: item.description ?? null,
            denomination_type: item.denominationType,
            amount: item.amount ?? null,
            min_amount: item.minAmount ?? null,
            max_amount: item.maxAmount ?? null,
            currency: "NGN",
            source_payload: item.source,
            evidence_hash: hash(item.source),
          })),
        );
        await tx("bill_catalogue_imports").where({ id: importId }).update({
          status: "DRAFT",
          source_hash: sourceHash,
          category_count: categories,
          product_count: drafts.length,
          completed_at: tx.fn.now(),
          updated_at: tx.fn.now(),
        });
      });
      return {
        import_id: importId,
        status: "DRAFT",
        category_count: categories,
        product_count: drafts.length,
        source_hash: sourceHash,
        replayed: false,
      };
    } catch (error) {
      await this.tenant(input.tenantId, (tx) =>
        tx("bill_catalogue_imports")
          .where({ id: importId })
          .update({
            status: "FAILED",
            failure_code:
              error instanceof Error
                ? error.message.slice(0, 100)
                : "IMPORT_FAILED",
            completed_at: tx.fn.now(),
            updated_at: tx.fn.now(),
          }),
      );
      throw error;
    }
  }

  public async publicationBinding(tenantId: string, importId: string) {
    const row = await this.tenant(tenantId, (tx) =>
      tx("bill_catalogue_imports")
        .where({ tenant_id: tenantId, id: importId })
        .first(),
    );
    if (!row || row.status !== "DRAFT")
      throw new Error("BILL_CATALOGUE_DRAFT_NOT_FOUND");
    return {
      action: "PRODUCT_PUBLICATION",
      resource_type: "bill_catalogue_import",
      resource_id: importId,
      payload_hash: publicationHash(
        importId,
        row.source_hash,
        Number(row.product_count),
      ),
    };
  }

  public async publish(input: {
    tenantId: string;
    importId: string;
    actorId: string;
    approvalId: string;
    idempotencyKey: string;
    correlationId: string;
  }) {
    const prior = await this.tenant(input.tenantId, (tx) =>
      tx("bill_catalogue_publications")
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        })
        .first(),
    );
    if (prior) {
      if (
        prior.import_id !== input.importId ||
        prior.approval_id !== input.approvalId
      )
        throw new Error("IDEMPOTENCY_KEY_REUSED");
      return publicationView(prior, true);
    }
    const binding = await this.publicationBinding(
      input.tenantId,
      input.importId,
    );
    await this.approvals.consume({
      tenantId: input.tenantId,
      approvalId: input.approvalId,
      action: binding.action,
      resourceType: binding.resource_type,
      resourceId: binding.resource_id,
      payloadHash: binding.payload_hash,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
    });
    return this.tenant(input.tenantId, async (tx) => {
      const draft = await tx("bill_catalogue_imports")
        .where({ tenant_id: input.tenantId, id: input.importId })
        .forUpdate()
        .first();
      if (!draft) throw new Error("BILL_CATALOGUE_DRAFT_NOT_FOUND");
      const completed = await tx("bill_catalogue_publications")
        .where({ tenant_id: input.tenantId, import_id: input.importId })
        .first();
      if (completed) return publicationView(completed, true);
      if (
        draft.status !== "DRAFT" ||
        publicationHash(
          input.importId,
          draft.source_hash,
          Number(draft.product_count),
        ) !== binding.payload_hash
      )
        throw new Error("BILL_CATALOGUE_DRAFT_CHANGED");
      await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", [
        `bill-catalogue:${input.tenantId}`,
      ]);
      const latest = await tx("bill_catalogue_publications")
        .where({ tenant_id: input.tenantId, provider_code: "MONNIFY" })
        .max<{ max: string }>("catalogue_version as max")
        .first();
      const version = Number(latest?.max ?? 0) + 1;
      const items = await tx("bill_catalogue_import_items")
        .where({ tenant_id: input.tenantId, import_id: input.importId })
        .orderBy("product_code");
      await tx("bill_products")
        .where({ tenant_id: input.tenantId })
        .whereIn(
          "provider_id",
          tx("bill_providers")
            .select("id")
            .where({ tenant_id: input.tenantId, provider_code: "MONNIFY" }),
        )
        .whereNotNull("published_at")
        .whereNull("effective_to")
        .update({ effective_to: tx.fn.now() });
      for (const item of items) {
        const categoryCode = `MONNIFY-${item.category_code}`.slice(0, 50);
        let category = await tx("bill_categories")
          .where({ code: categoryCode })
          .first();
        if (!category) {
          await tx("bill_categories")
            .insert({
              code: categoryCode,
              name: item.category_name,
              category: item.category,
            })
            .onConflict("code")
            .ignore();
          category = await tx("bill_categories")
            .where({ code: categoryCode })
            .first();
        }
        let provider = await tx("bill_providers")
          .where({
            tenant_id: input.tenantId,
            category_id: category.id,
            provider_code: "MONNIFY",
          })
          .first();
        if (!provider)
          [provider] = await tx("bill_providers")
            .insert({
              tenant_id: input.tenantId,
              category_id: category.id,
              provider_code: "MONNIFY",
              provider_name: item.biller_name,
            })
            .returning("*");
        await tx("bill_products").insert({
          tenant_id: input.tenantId,
          provider_id: provider.id,
          category_id: category.id,
          product_code: item.product_code,
          product_name: item.product_name,
          description: item.description,
          denomination_type: item.denomination_type,
          amount: item.amount,
          min_amount: item.min_amount,
          max_amount: item.max_amount,
          currency: "NGN",
          catalogue_version: version,
          metadata: {
            biller_code: item.biller_code,
            evidence_hash: item.evidence_hash,
          },
          published_at: tx.fn.now(),
          effective_from: tx.fn.now(),
        });
      }
      const [publication] = await tx("bill_catalogue_publications")
        .insert({
          tenant_id: input.tenantId,
          import_id: input.importId,
          provider_code: "MONNIFY",
          catalogue_version: version,
          approval_id: input.approvalId,
          approval_payload_hash: binding.payload_hash,
          published_by: input.actorId,
          idempotency_key: input.idempotencyKey,
          product_count: items.length,
        })
        .returning("*");
      await tx("bill_catalogue_imports")
        .where({ id: input.importId })
        .update({ status: "PUBLISHED", updated_at: tx.fn.now() });
      await tx("payment_outbox_events").insert({
        id: randomUUID(),
        tenant_id: input.tenantId,
        aggregate_type: "bill_catalogue",
        aggregate_id: publication.id,
        event_type: "payment.bill-catalogue-published.v1",
        payload: {
          publication_id: publication.id,
          import_id: input.importId,
          provider: "MONNIFY",
          catalogue_version: version,
          product_count: items.length,
        },
        correlation_id: input.correlationId,
        causation_id: input.approvalId,
        idempotency_key: `bill-catalogue-published:${publication.id}`,
      });
      return publicationView(publication, false);
    });
  }

  private async discover(): Promise<Draft[]> {
    const result: Draft[] = [];
    const categories = await allPages((page) =>
      this.monnify.categories(100, page),
    );
    for (const category of categories) {
      const categoryCode = text(category, "categoryCode", "code");
      const categoryName = text(category, "categoryName", "name");
      const normalized = normalizeCategory(categoryCode, categoryName);
      if (!normalized) continue;
      const billers = await allPages((page) =>
        this.monnify.billers(categoryCode, 100, page),
      );
      for (const biller of billers) {
        const billerCode = text(biller, "billerCode", "code");
        const billerName = text(biller, "billerName", "name");
        const products = await allPages((page) =>
          this.monnify.products(billerCode, 100, page),
        );
        for (const product of products) {
          const fixed = product.amount !== undefined && product.amount !== null;
          result.push({
            categoryCode,
            categoryName,
            category: normalized,
            billerCode,
            billerName,
            productCode: text(product, "productCode", "code"),
            productName: text(product, "productName", "name"),
            ...(typeof product.description === "string"
              ? { description: product.description }
              : {}),
            denominationType: fixed ? "FIXED" : "VARIABLE",
            ...(fixed
              ? { amount: minor(product.amount) }
              : {
                  minAmount: minor(product.minAmount ?? product.minimumAmount),
                  maxAmount: minor(product.maxAmount ?? product.maximumAmount),
                }),
            source: { category, biller, product },
          });
        }
      }
    }
    return result;
  }

  private tenant<T>(
    tenantId: string,
    work: (tx: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [
        tenantId,
      ]);
      return work(tx);
    });
  }
}

export const publicationHash = (
  importId: string,
  sourceHash: string,
  count: number,
) =>
  hash({
    import_id: importId,
    source_hash: sourceHash,
    product_count: count,
    provider: "MONNIFY",
  });
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const records = (body: Record<string, unknown>): Record<string, unknown>[] => {
  const value = body.content ?? body.data ?? body.items;
  if (!Array.isArray(value)) throw new Error("MONNIFY_CATALOGUE_SHAPE_INVALID");
  return value.filter(
    (x): x is Record<string, unknown> =>
      !!x && typeof x === "object" && !Array.isArray(x),
  );
};
const allPages = async (
  fetchPage: (page: number) => Promise<Record<string, unknown>>,
) => {
  const output: Record<string, unknown>[] = [];
  for (let page = 0; page < 100; page += 1) {
    const body = await fetchPage(page);
    output.push(...records(body));
    const totalPages = Number(body.totalPages ?? body.total_pages);
    if (
      body.last === true ||
      (!Number.isSafeInteger(totalPages) && page === 0) ||
      (Number.isSafeInteger(totalPages) && page + 1 >= totalPages)
    )
      return output;
  }
  throw new Error("MONNIFY_CATALOGUE_PAGE_LIMIT_EXCEEDED");
};
const text = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys)
    if (typeof row[key] === "string" && row[key].trim()) return row[key].trim();
  throw new Error("MONNIFY_CATALOGUE_FIELD_MISSING");
};
const minor = (value: unknown) => {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!match) throw new Error("MONNIFY_CATALOGUE_AMOUNT_INVALID");
  const digits = `${match[1]}${match[2] ?? ""}`.replace(/^0+(?=\d)/, "");
  const scale = (match[2]?.length ?? 0) - Number(match[3] ?? 0) - 2;
  let result: bigint;
  if (scale <= 0) result = BigInt(digits) * 10n ** BigInt(-scale);
  else {
    const divisor = 10n ** BigInt(scale);
    const raw = BigInt(digits);
    if (raw % divisor !== 0n)
      throw new Error("MONNIFY_CATALOGUE_AMOUNT_INVALID");
    result = raw / divisor;
  }
  if (result <= 0n) throw new Error("MONNIFY_CATALOGUE_AMOUNT_INVALID");
  return result.toString();
};
const normalizeCategory = (code: string, name: string) => {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("AIRTIME")) return "AIRTIME";
  if (value.includes("DATA")) return "DATA";
  if (value.includes("ELECT")) return "ELECTRICITY";
  if (value.includes("CABLE") || value.includes("TV")) return "CABLE_TV";
  if (value.includes("INTERNET")) return "INTERNET";
  return undefined;
};
const importView = (row: Record<string, unknown>, replayed: boolean) => ({
  import_id: row.id,
  status: row.status,
  category_count: Number(row.category_count),
  product_count: Number(row.product_count),
  source_hash: row.source_hash,
  replayed,
});
const publicationView = (row: Record<string, unknown>, replayed: boolean) => ({
  publication_id: row.id,
  import_id: row.import_id,
  catalogue_version: Number(row.catalogue_version),
  product_count: Number(row.product_count),
  published_at:
    row.published_at instanceof Date
      ? row.published_at.toISOString()
      : row.published_at,
  replayed,
});
