import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import routes from "./pages/routes";

const { Header, Sider, Content } = Layout;

const AppHeader = ({ toggleSider }) => {
  const location = useLocation();
  const route = routes.find((r) => r.path === location.pathname);
  const title = route ? route.title : "App";

  return (
    <Header
      style={{
        background: "#fff",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Hamburger icon to toggle the Sider */}
      <Button
        type="text"
        icon={<span style={{ fontSize: "24px" }}>☰</span>}
        onClick={toggleSider}
        style={{ fontSize: "24px", marginRight: 16 }}
      />
      <span style={{ fontSize: "24px", fontWeight: "bold" }}>{title}</span>
    </Header>
  );
};

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        collapsedWidth={0}
        style={{ background: "#001529" }}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={() => setCollapsed(true)}
        >
          {routes.map((route) => (
            <Menu.Item key={route.path}>
              <Link to={route.path}>{route.title}</Link>
            </Menu.Item>
          ))}
        </Menu>
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Pass the toggleSider function down to AppHeader */}
        <AppHeader toggleSider={() => setCollapsed(!collapsed)} />

        {/* Main Content */}
        <Content style={{ padding: 20 }}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
