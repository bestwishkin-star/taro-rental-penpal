export interface RentalListing {
  id: string;
  title: string;
  location: string;
  price: string;
  area: string;
  roomType: string;
  tags: string[];
  photos: string[];
}

export interface ListRentalsQuery {
  keyword?: string;
  filter?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
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
