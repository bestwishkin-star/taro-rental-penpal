export interface RentalListing {
  district: string;
  id: string;
  meta: string;
  price: string;
  tags: string[];
  title: string;
}

export interface CreateRentalInput {
  price: string;
  location: string;
  roomType: string;
  area?: string;
  experience: string;
  tags: string[];
  wechat?: string;
  photos: string[];
}

export interface CreateRentalResponse {
  id: string;
}
