export interface RentalRegionInput {
  province: string;
  city: string;
  district: string;
}

export interface RentalCoordinate {
  latitude: number;
  longitude: number;
}

export interface RentalStructuredLocation extends RentalRegionInput {
  address?: string;
  latitude?: number;
  longitude?: number;
}
