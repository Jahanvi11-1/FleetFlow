export const validateLicensePlate = (plate) => {
  const pattern = /^[A-Z]{2} [0-9]{2} [A-Z]{2} [0-9]{4}$/;
  return pattern.test(plate);
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};
