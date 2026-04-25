/**
 * GST Calculation Service for Indian Market
 * 
 * GST Rates:
 * - For Punjab (intra-state): 2.5% CGST + 2.5% SGST = 5% total
 * - For other states (inter-state): 5% IGST
 * 
 * Dairy products typically fall under 5% GST slab in India
 */

/**
 * Calculate GST breakdown for inclusive pricing
 * @param {number} amount - The amount including GST
 * @param {string} state - The delivery state
 * @returns {object} GST breakdown and totals
 */
function calculateGST(amount, state) {
  if (!amount || amount <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGST: 0,
      taxableAmount: 0,
      totalWithGST: 0,
      gstRate: 0
    };
  }

  const normalizedState = state ? state.toLowerCase().trim() : '';
  const isPunjab = normalizedState === 'punjab' ||
                   normalizedState === 'pb' ||
                   normalizedState.includes('punjab');

  const gstRate = 0.05; // 5% GST rate for dairy products
  
  // For inclusive pricing: amount already includes GST
  // taxableAmount = amount / (1 + gstRate)
  const taxableAmount = amount / (1 + gstRate);
  const totalGST = amount - taxableAmount;

  if (isPunjab) {
    const cgst = totalGST / 2; // Split GST equally between CGST and SGST
    const sgst = totalGST / 2;

    return {
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: 0,
      totalGST: Math.round(totalGST * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      totalWithGST: amount, // Amount already includes GST
      gstRate: 5,
      isInterState: false,
      state: 'Punjab'
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: Math.round(totalGST * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      totalWithGST: amount, // Amount already includes GST
      gstRate: 5,
      isInterState: true,
      state: state || 'Other State'
    };
  }
}

/**
 * Get GST breakdown for display purposes
 * @param {Object} gstCalculation - Result from calculateGST
 * @returns {Object} Formatted GST breakdown for display
 */
function formatGSTBreakdown(gstCalculation) {
  if (!gstCalculation) {
    return {
      cgstText: '₹0.00',
      sgstText: '₹0.00',
      igstText: '₹0.00',
      totalGSTText: '₹0.00',
      gstRateText: '0%',
      typeText: 'No GST'
    };
  }

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  let breakdown = {
    cgstText: formatCurrency(gstCalculation.cgst),
    sgstText: formatCurrency(gstCalculation.sgst),
    igstText: formatCurrency(gstCalculation.igst),
    totalGSTText: formatCurrency(gstCalculation.totalGST),
    gstRateText: `${gstCalculation.gstRate}%`,
    typeText: gstCalculation.isInterState ? 'IGST' : 'CGST + SGST'
  };

  return breakdown;
}

/**
 * Validate Indian state name
 * @param {string} state - State name to validate
 * @returns {boolean} True if valid Indian state
 */
function isValidIndianState(state) {
  if (!state || typeof state !== 'string') return false;
  
  const validStates = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand',
    'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
    'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan',
    'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
    'uttarakhand', 'west bengal', 'delhi', 'jammu & kashmir', 'ladakh'
  ];
  
  return validStates.includes(state.toLowerCase().trim());
}

module.exports = {
  calculateGST,
  formatGSTBreakdown,
  isValidIndianState
};
