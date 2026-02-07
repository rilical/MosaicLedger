export type NessieCustomer = {
  _id: string;
  first_name?: string;
  last_name?: string;
};

export type NessieAccount = {
  _id: string;
  type?: string;
  nickname?: string;
  balance?: number;
  customer_id?: string;
};

export type NessiePurchase = {
  _id: string;
  amount: number;
  description?: string;
  merchant_id?: string;
  purchase_date?: string; // YYYY-MM-DD
  status?: string;
  type?: string;
  payer_id?: string;
};

export type NessieDeposit = {
  _id: string;
  amount: number;
  description?: string;
  deposit_date?: string; // YYYY-MM-DD
  status?: string;
  type?: string;
};
