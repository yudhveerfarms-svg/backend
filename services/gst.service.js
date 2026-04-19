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
 * Calculate GST based on delivery state
 * @param {number} amount - The base amount before GST
 * @param {string} state - Delivery state name
 * @returns {Object} GST breakdown
 */
function calculateGST(amount, state) {
  if (!amount || amount <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGST: 0,
      totalWithGST: 0,
      gstRate: 0
    };
  }

  // Normalize state name for comparison
  const normalizedState = state ? state.toLowerCase().trim() : '';
  
  // Check if delivery is within Punjab
  const isPunjab = normalizedState === 'punjab' || 
                   normalizedState === 'pb' ||
                   normalizedState.includes('punjab');
  
  const gstRate = 0.05; // 5% GST rate for dairy products
  
  if (isPunjab) {
    // Intra-state: Apply CGST + SGST
    const cgst = amount * 0.025; // 2.5% CGST
    const sgst = amount * 0.025; // 2.5% SGST
    const totalGST = cgst + sgst;
    
    return {
      cgst: Math.round(cgst * 100) / 100, // Round to 2 decimal places
      sgst: Math.round(sgst * 100) / 100,
      igst: 0,
      totalGST: Math.round(totalGST * 100) / 100,
      totalWithGST: amount + Math.round(totalGST * 100) / 100,
      gstRate: 5,
      isInterState: false,
      state: 'Punjab'
    };
  } else {
    // Inter-state: Apply IGST
    const igst = amount * gstRate;
    
    return {
      cgst: 0,
      sgst: 0,
      igst: Math.round(igst * 100) / 100,
      totalGST: Math.round(igst * 100) / 100,
      totalWithGST: amount + Math.round(igst * 100) / 100,
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
