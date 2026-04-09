export type RentalStatus = 'active' | 'inactive';

export interface RentalListing {
  id: string;
  title: string;
  location: string;
  price: string;
  area: string;
  roomType: string;
  tags: string[];
  photos: string[];
  status: RentalStatus;
}

export interface ListRentalsQuery {
  keyword?: string;
  filter?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  priceRange?: 'lt2000' | '2000to4000' | 'gt4000';
}

export interface RentalDetail extends RentalListing {
  experience: string;
  wechat: string;
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

export interface FavoriteStatus {
  isFavorited: boolean;
}

export interface UpdateRentalStatusInput {
  status: RentalStatus;
}
