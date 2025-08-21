// CurrencyFormatCustom.tsx
import React from 'react';
import { NumericFormat,type NumericFormatProps, type NumberFormatValues } from 'react-number-format';

interface CurrencyFormatCustomProps extends Omit<NumericFormatProps, 'onValueChange'> {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
}

const CurrencyFormatCustom = React.forwardRef<NumericFormatProps, CurrencyFormatCustomProps>(
  function CurrencyFormatCustom(props, ref) {
    const { onChange,style, name, ...other } = props;
    return (
      <NumericFormat
        {...other}
        getInputRef={ref}
        style={{ height: '100%', ...style }}
        onValueChange={(values: NumberFormatValues) => {
          onChange({
            target: {
              name,
              // aquí le pasamos el valor limpio (string) a tu TextField.onChange
              value: values.floatValue?.toString() || '0',
            },
          });
        }}
        thousandSeparator=","
        decimalSeparator="."
        decimalScale={2}
        fixedDecimalScale
        prefix="$ "
        allowNegative={false}
      />
    );
  }
);

export default CurrencyFormatCustom;
