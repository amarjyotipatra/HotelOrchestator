import { SupplierHotel } from "../types/hotel";

// ─── Supplier A: Static hotel data ───
export const supplierAData: SupplierHotel[] = [
  { hotelId: "a1", name: "Holtin",         price: 6000,  city: "delhi",   commissionPct: 10 },
  { hotelId: "a2", name: "Radison",        price: 5900,  city: "delhi",   commissionPct: 13 },
  { hotelId: "a3", name: "Taj Mahal Palace",price: 12000, city: "delhi",   commissionPct: 8  },
  { hotelId: "a4", name: "The Leela",      price: 9500,  city: "delhi",   commissionPct: 11 },
  { hotelId: "a5", name: "ITC Grand",      price: 8200,  city: "delhi",   commissionPct: 9  },
  { hotelId: "a6", name: "The Oberoi",     price: 15000, city: "mumbai",  commissionPct: 7  },
  { hotelId: "a7", name: "Trident",        price: 7800,  city: "mumbai",  commissionPct: 12 },
  { hotelId: "a8", name: "JW Marriott",    price: 11000, city: "mumbai",  commissionPct: 10 },
  { hotelId: "a9", name: "Hyatt Regency",  price: 6800,  city: "bangalore", commissionPct: 14 },
  { hotelId: "a10",name: "Sheraton Grand",  price: 7200,  city: "bangalore", commissionPct: 11 },
];

// ─── Supplier B: Static hotel data (overlapping names with different prices) ───
export const supplierBData: SupplierHotel[] = [
  { hotelId: "b1", name: "Holtin",         price: 5340,  city: "delhi",   commissionPct: 20 },
  { hotelId: "b2", name: "Radison",        price: 6100,  city: "delhi",   commissionPct: 15 },
  { hotelId: "b3", name: "Taj Mahal Palace",price: 11500, city: "delhi",   commissionPct: 12 },
  { hotelId: "b4", name: "The Leela",      price: 10200, city: "delhi",   commissionPct: 9  },
  { hotelId: "b5", name: "Park Hyatt",     price: 8800,  city: "delhi",   commissionPct: 16 },
  { hotelId: "b6", name: "The Oberoi",     price: 14200, city: "mumbai",  commissionPct: 10 },
  { hotelId: "b7", name: "Trident",        price: 8100,  city: "mumbai",  commissionPct: 11 },
  { hotelId: "b8", name: "Taj Lands End",  price: 9600,  city: "mumbai",  commissionPct: 13 },
  { hotelId: "b9", name: "Hyatt Regency",  price: 7100,  city: "bangalore", commissionPct: 12 },
  { hotelId: "b10",name: "Ritz-Carlton",   price: 13000, city: "bangalore", commissionPct: 8  },
];
