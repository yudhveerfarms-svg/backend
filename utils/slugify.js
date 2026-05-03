/**
 * Convert a string to a URL-friendly slug
 * @param {string} text - The text to convert
 * @returns {string} - The slugified string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * Generate a unique slug by appending a number if needed
 * @param {string} baseSlug - The base slug to check
 * @param {Function} existsCheck - Function to check if slug exists
 * @returns {string} - A unique slug
 */
async function generateUniqueSlug(baseSlug, existsCheck) {
  let slug = baseSlug;
  let counter = 1;
  
  while (await existsCheck(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

module.exports = {
  slugify,
  generateUniqueSlug
};
