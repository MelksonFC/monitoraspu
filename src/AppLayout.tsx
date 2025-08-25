import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { Box } from "@mui/material";

const headerHeight = 64;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

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
            background: "#fafafa",
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