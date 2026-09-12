export interface LedgerPostingGateway {
  post(input: {
    tenantId: string;
    idempotencyKey: string;
    reference: string;
    currency: string;
    debitAccountId: string;
    creditAccountId: string;
    amountMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }>;
}

export interface LedgerTransferGateway {
  createHold(input: {
    tenantId: string;
    idempotencyKey: string;
    accountId: string;
    amountMinor: string;
    currency: string;
    purpose: string;
    expiresAt: string;
  }): Promise<{ holdId: string; replayed: boolean }>;
  captureHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
    reference: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }>;
  releaseHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
  }): Promise<void>;
}

export interface BillLedgerGateway {
  createHold: LedgerTransferGateway["createHold"];
  releaseHold: LedgerTransferGateway["releaseHold"];
  captureBillHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
    reference: string;
    sourceAccountId: string;
    providerPayableAccountId: string;
    revenueAccountId?: string;
    taxAccountId?: string;
    amountMinor: string;
    feeMinor: string;
    taxMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }>;
}

export interface LedgerReversalGateway {
  reverseTransaction(input: {
    tenantId: string;
    transactionId: string;
    idempotencyKey: string;
    reason: string;
    approvalId?: string;
    automatedRuleId?: string;
  }): Promise<{ reversalTransactionId: string; replayed: boolean }>;
}

export class HttpLedgerPostingGateway
  implements
    LedgerPostingGateway,
    LedgerTransferGateway,
    LedgerReversalGateway,
    BillLedgerGateway
{
  public constructor(
    private readonly baseUrl: string,
    private readonly serviceToken: string,
    private readonly http: typeof fetch = fetch,
  ) {}

  public async post(input: {
    tenantId: string;
    idempotencyKey: string;
    reference: string;
    currency: string;
    debitAccountId: string;
    creditAccountId: string;
    amountMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }> {
    const response = await this.http(
      new URL("/internal/v1/postings", this.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.serviceToken}`,
          "content-type": "application/json",
          "x-tenant-id": input.tenantId,
          "x-calling-service": "parc-payment",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          reference: input.reference,
          currency: input.currency,
          entries: [
            {
              account_id: input.debitAccountId,
              direction: "DEBIT",
              amount_minor: input.amountMinor,
            },
            {
              account_id: input.creditAccountId,
              direction: "CREDIT",
              amount_minor: input.amountMinor,
            },
          ],
        }),
      },
    );
    const body = (await response.json()) as {
      transaction_id?: string;
      replayed?: boolean;
    };
    if (!response.ok || !body.transaction_id)
      throw new Error(`Ledger posting failed with ${response.status}`);
    return {
      transactionId: body.transaction_id,
      replayed: body.replayed === true,
    };
  }

  public async createHold(input: {
    tenantId: string;
    idempotencyKey: string;
    accountId: string;
    amountMinor: string;
    currency: string;
    purpose: string;
    expiresAt: string;
  }): Promise<{ holdId: string; replayed: boolean }> {
    const response = await this.request("/internal/v1/holds", input, {
      account_id: input.accountId,
      amount_minor: input.amountMinor,
      currency: input.currency,
      purpose: input.purpose,
      expires_at: input.expiresAt,
    });
    const body = (await response.json()) as {
      hold_id?: string;
      replayed?: boolean;
    };
    if (!response.ok || !body.hold_id)
      throw new Error(`Ledger hold failed with ${response.status}`);
    return { holdId: body.hold_id, replayed: body.replayed === true };
  }

  public async captureHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
    reference: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }> {
    const response = await this.request(
      `/internal/v1/holds/${encodeURIComponent(input.holdId)}/capture`,
      input,
      {
        reference: input.reference,
        entries: [
          {
            account_id: input.sourceAccountId,
            direction: "DEBIT",
            amount_minor: input.amountMinor,
          },
          {
            account_id: input.destinationAccountId,
            direction: "CREDIT",
            amount_minor: input.amountMinor,
          },
        ],
      },
    );
    const body = (await response.json()) as {
      transaction_id?: string;
      replayed?: boolean;
    };
    if (!response.ok || !body.transaction_id)
      throw new Error(`Ledger hold capture failed with ${response.status}`);
    return {
      transactionId: body.transaction_id,
      replayed: body.replayed === true,
    };
  }

  public async releaseHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
  }): Promise<void> {
    const response = await this.request(
      `/internal/v1/holds/${encodeURIComponent(input.holdId)}/release`,
      input,
    );
    if (!response.ok)
      throw new Error(`Ledger hold release failed with ${response.status}`);
  }

  public async captureBillHold(input: {
    tenantId: string;
    idempotencyKey: string;
    holdId: string;
    reference: string;
    sourceAccountId: string;
    providerPayableAccountId: string;
    revenueAccountId?: string;
    taxAccountId?: string;
    amountMinor: string;
    feeMinor: string;
    taxMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }> {
    const entries = [
      {
        account_id: input.sourceAccountId,
        direction: "DEBIT",
        amount_minor: (
          BigInt(input.amountMinor) +
          BigInt(input.feeMinor) +
          BigInt(input.taxMinor)
        ).toString(),
      },
      {
        account_id: input.providerPayableAccountId,
        direction: "CREDIT",
        amount_minor: input.amountMinor,
      },
    ];
    if (BigInt(input.feeMinor) > 0n) {
      if (!input.revenueAccountId)
        throw new Error("Fee revenue account required");
      entries.push({
        account_id: input.revenueAccountId,
        direction: "CREDIT",
        amount_minor: input.feeMinor,
      });
    }
    if (BigInt(input.taxMinor) > 0n) {
      if (!input.taxAccountId) throw new Error("Tax account required");
      entries.push({
        account_id: input.taxAccountId,
        direction: "CREDIT",
        amount_minor: input.taxMinor,
      });
    }
    const response = await this.request(
      `/internal/v1/holds/${encodeURIComponent(input.holdId)}/capture`,
      input,
      { reference: input.reference, entries },
    );
    const body = (await response.json()) as {
      transaction_id?: string;
      replayed?: boolean;
    };
    if (!response.ok || !body.transaction_id)
      throw new Error(`Ledger bill capture failed with ${response.status}`);
    return {
      transactionId: body.transaction_id,
      replayed: body.replayed === true,
    };
  }

  public async reverseTransaction(input: {
    tenantId: string;
    transactionId: string;
    idempotencyKey: string;
    reason: string;
    approvalId?: string;
    automatedRuleId?: string;
  }): Promise<{ reversalTransactionId: string; replayed: boolean }> {
    const response = await this.request(
      `/internal/v1/transactions/${encodeURIComponent(input.transactionId)}/reversals`,
      input,
      {
        reason: input.reason,
        ...(input.approvalId ? { approval_id: input.approvalId } : {}),
        ...(input.automatedRuleId
          ? { automated_rule_id: input.automatedRuleId }
          : {}),
      },
    );
    const body = (await response.json()) as {
      reversal_transaction_id?: string;
      replayed?: boolean;
    };
    if (!response.ok || !body.reversal_transaction_id)
      throw new Error(`Ledger reversal failed with ${response.status}`);
    return {
      reversalTransactionId: body.reversal_transaction_id,
      replayed: body.replayed === true,
    };
  }

  private request(
    path: string,
    identity: { tenantId: string; idempotencyKey: string },
    body?: object,
  ): Promise<Response> {
    return this.http(new URL(path, this.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.serviceToken}`,
        "content-type": "application/json",
        "x-tenant-id": identity.tenantId,
        "x-calling-service": "parc-payment",
        "idempotency-key": identity.idempotencyKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
}
