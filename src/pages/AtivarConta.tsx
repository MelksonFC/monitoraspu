import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Box, Typography, Button, CircularProgress } from "@mui/material";

const apiUrl = import.meta.env.VITE_API_URL;

const AtivarConta: React.FC = () => {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      fetch(`${apiUrl}/api/ativar?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.message && data.message.toLowerCase().includes("sucesso")) {
            setStatus("ok");
            setMsg(data.message);
          } else {
            setStatus("error");
            setMsg(data.message || "Erro na ativação.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMsg("Erro ao ativar conta.");
        });
    } else {
      setStatus("error");
      setMsg("Token inválido ou ausente.");
    }
  }, [location.search]);

  return (
    <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2, maxWidth: 400, mx: "auto" }}>
      <Typography variant="h5" align="center" mb={3}>
        Ativação de Conta
      </Typography>
      {status === "loading" ? (
        <CircularProgress />
      ) : (
        <Typography align="center" color={status === "ok" ? "primary" : "error"}>{msg}</Typography>
      )}
      {status === "ok" && (
        <Button 
          component={Link} 
          to="/login" 
          variant="contained" 
          sx={{ mt: 2 }} 
          fullWidth
        >
          Ir para Login
        </Button>
      )}
    </Box>
  );
};
export default AtivarConta;
