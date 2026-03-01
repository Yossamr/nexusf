export const calculateEgyptianBill = (kwh: number): string => {
  let cost = 0;
  let serviceFee = 0;

  if (kwh <= 100) {
    if (kwh <= 50) {
      cost = kwh * 0.68; // الشريحة الأولى
      serviceFee = 1;
    } else {
      cost = (50 * 0.68) + ((kwh - 50) * 0.78); // الشريحة الثانية
      serviceFee = 2;
    }
  } else if (kwh <= 650) {
    if (kwh <= 200) {
      cost = kwh * 0.95; // الشريحة الثالثة (تحاسب من الصفر)
      serviceFee = 6;
    } else if (kwh <= 350) {
      cost = (200 * 0.95) + ((kwh - 200) * 1.55); // الشريحة الرابعة
      serviceFee = 11;
    } else {
      cost = (200 * 0.95) + (150 * 1.55) + ((kwh - 350) * 1.95); // الشريحة الخامسة
      serviceFee = 15;
    }
  } else if (kwh <= 1000) {
    // من يعبر 650 كيلو، يسقط عنه الدعم تماماً ويُحاسب من الصفر على سعر 2.10 جنيه
    cost = kwh * 2.10;
    serviceFee = 25;
  } else {
    // الشريحة السابعة، من يعبر 1000 كيلو يُحاسب من الصفر على سعر 2.23 جنيه
    cost = kwh * 2.23;
    serviceFee = 40;
  }

  return (cost + serviceFee).toFixed(2);
};
