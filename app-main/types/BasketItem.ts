// types/BasketItem.ts

/**
 * A unified interface for basket items used across the app.
 */
export interface BasketItem {
    slug: string;
    quantity: number;
  
    /** Price per package in øre (e.g. 100 = 1.00 DKK). */
    pricePerPackage?: number;
  
    /** Total price in øre for this item. */
    totalPrice?: number;
  
    /** Pant (recycling) fee in øre for this item. */
    totalRecyclingFee?: number; // optional, can be 0 if not applicable
  
    // If you need a package size:
    packages_size?: number;
    sugarPreference?: string;
  
    /** If the item is a "mix & match" with selected drinks. */
    selectedDrinks?: Record<string, number>;
  }
  