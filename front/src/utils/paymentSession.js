const STORAGE_KEY = "hive:last-konnect-payment";

export const savePendingKonnectPayment = (payment) => {
  if (!payment) {
    return;
  }

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...payment,
        savedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Unable to store pending Konnect payment session:", error);
  }
};

export const readPendingKonnectPayment = () => {
  try {
    const rawValue = sessionStorage.getItem(STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Unable to read pending Konnect payment session:", error);
    return null;
  }
};

export const clearPendingKonnectPayment = (paymentRef = null) => {
  try {
    if (!paymentRef) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const current = readPendingKonnectPayment();
    if (!current || current.paymentRef === paymentRef) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Unable to clear pending Konnect payment session:", error);
  }
};
