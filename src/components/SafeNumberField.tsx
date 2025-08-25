import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

// A interface não precisa de mudanças.
interface SafeNumberFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Componente de campo numérico que formata o valor como moeda brasileira (BRL)
 * sem interferir na posição do cursor durante a digitação.
 */
export const SafeNumberField: React.FC<SafeNumberFieldProps> = ({
  value,
  onChange,
  InputProps = {}, // Pega o InputProps para verificar o readOnly
  ...props
}) => {
  
  const isReadOnly = InputProps.readOnly || props.disabled;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Se for somente leitura, não faz nada.
    if (isReadOnly) return;

    // Pega o valor atual e remove tudo que não for dígito.
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, '');

    // Atualiza o estado no componente pai com a string de dígitos puros.
    // O estado agora armazena "12345" em vez de "123,45".
    onChange(digitsOnly);
  };

  // Função para formatar os dígitos puros (ex: "12345") em uma string de moeda (ex: "123,45")
  const formatForDisplay = (digits: string): string => {
    if (!digits) return '';

    // Converte a string de dígitos para um número, tratando-a como centavos.
    const numberValue = parseInt(digits, 10) / 100;

    // Formata o número para o padrão brasileiro.
    return numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <TextField
      {...props} // Passa todas as props (como label, required, error, etc.)
      // O valor exibido é sempre a versão formatada dos dígitos puros.
      value={formatForDisplay(value)}
      // A função de manipulação de mudança é a nossa função customizada.
      onChange={handleChange}
      // Repassa o InputProps, incluindo a propriedade `readOnly` crucial.
      InputProps={{
        ...InputProps,
        inputMode: 'numeric', // Melhora a experiência em mobile.
      }}
    />
  );
};