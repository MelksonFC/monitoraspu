import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Box } from "@mui/material";
import { useLayout } from "./LayoutContext";

const headerHeight = 64;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const { isPresentationMode } = useLayout();

  const handleToggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  if (isPresentationMode) {
    return (
      <Box 
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          height: '100vh',
          overflow: 'auto',
          bgcolor: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
        }}
      >
        {children}
      </Box>
    );
  }
  
  // Renderização normal se não estiver no modo de apresentação
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <Box 
        sx={{ 
          display: "flex", 
          flex: 1, 
          overflow: 'hidden', 
          pt: `${headerHeight}px` 
        }}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={handleToggleSidebar}
          headerHeight={headerHeight}
        />
        <Box 
          component="main"
          sx={{
            flex: 1,
            bgcolor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            display: "flex",
            flexDirection: "column",
            minHeight: 0, 
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
