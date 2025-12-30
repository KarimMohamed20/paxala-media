export interface ClientContact {
  id: string;
  name: string;
  phone: string;
  jobTitle?: string | null;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContactWithClient extends ClientContact {
  client: {
    id: string;
    name: string | null;
  };
}

export interface CreateContactInput {
  name: string;
  phone: string;
  jobTitle?: string;
  clientId: string;
}

export interface UpdateContactInput {
  name?: string;
  phone?: string;
  jobTitle?: string;
}
