import React from "react";
import ImovelForm from "../components/ImovelForm";
import { Box } from "@mui/material";

const CadastroImovel: React.FC = () => {
  return (
    <Box sx={{ p: 4 }}>
      <ImovelForm />
    </Box>
  );
};

export default CadastroImovel;