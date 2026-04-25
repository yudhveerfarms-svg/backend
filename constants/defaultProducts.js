/**
 * Fallback catalog when MongoDB has no products (legacy storefront behaviour).
 */
const defaultProducts = [
  {
    id: '1',
    name: 'A2 Desi Ghee',
    description:
      'Pure, traditional bilona A2 Desi Ghee made from the milk of grass-fed cows. Rich in nutrients and authentic aroma.',
    price: 'Starting from ₹1400',
    image: '/images/gheemain.jpeg',
    type: 'Dairy',
    weight: 'Various Sizes',
  },
  {
    id: '2',
    name: 'Stone-Ground Aata',
    description:
      'Premium whole wheat aata, stone-ground to preserve natural fibers and nutrients. Perfect for soft, healthy rotis.',
    price: 'Starting from ₹500',
    image: '/images/aatamain.jpeg',
    type: 'Pantry',
    weight: 'Various Sizes',
  },
  {
    id: '3',
    name: 'Natural Premium Honey',
    description: '100% pure, unprocessed natural honey sourced from our own farm apiaries. High in antioxidants.',
    price: 'Starting from ₹500',
    image: '/images/honeymain.jpeg',
    type: 'Pantry',
    weight: 'Various Sizes',
  },
  {
    id: '4',
    name: 'Cold-Pressed Mustard Oil',
    description: 'Traditional wood-pressed kachi ghani mustard oil. Retains natural pungency and health benefits.',
    price: 'Starting from ₹500',
    image: '/images/mus2.jpeg',
    type: 'Pantry',
    weight: 'Various Sizes',
  },
  {
    id: '5',
    name: 'Organic Desi Gur (Jaggery)',
    description:
      'Naturally processed organic jaggery made from pure sugarcane juice. Rich in minerals, chemical-free, and full of traditional sweetness.',
    price: 'Starting from ₹250',
    image: '/images/gurmain.jpeg',
    type: 'Pantry',
    weight: 'Various Sizes',
  },
];

module.exports = { defaultProducts };
