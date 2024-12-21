import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import { Layout, Menu, Button, Popover } from "antd";
import { db } from "./firebase/firebase"; // Adjust path as per your setup
import { doc, getDoc } from "firebase/firestore";
import routes from "./pages/routes";
import styled from "styled-components";

// Define styled-components
const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

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
  const [messageText, setMessageText] = useState("");
  const [isPopVisible, setIsPopVisible] = useState(false);
  const location = useLocation();
  const docRef = doc(db, "managerMessages", "currentMessage");

  // Fetch the message from Firestore
  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMessageText(docSnap.data().message || "");
        }
      } catch (error) {
        console.error("Error fetching manager message:", error);
      }
    };

    fetchMessage();
    const interval = setInterval(() => {
      fetchMessage();
    }, 3600000); // Fetch new message every hour

    return () => clearInterval(interval);
  }, [docRef]);

  // Timer to show pop-over every hour
  useEffect(() => {
    const lastPopTime = localStorage.getItem("lastPopTime");
    const now = new Date().getTime();

    // Show pop-over if an hour has passed
    if (!lastPopTime || now - lastPopTime > 3600000) {
      setIsPopVisible(true);
      localStorage.setItem("lastPopTime", now);
    }

    const interval = setInterval(() => {
      setIsPopVisible(true);
      localStorage.setItem("lastPopTime", new Date().getTime());
    }, 3600000); // One hour interval

    return () => clearInterval(interval); // Clean up on unmount
  }, []);

  // Handle pop-over dismissal
  const handleDismiss = () => {
    setIsPopVisible(false);
  };

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
          {/* Popover to show manager's message */}
          <Popover
            content={
              <>
                <div dangerouslySetInnerHTML={{ __html: messageText }} />
                <Button
                  onClick={handleDismiss}
                  type="primary"
                  style={{ marginTop: 10 }}
                >
                  Dismiss
                </Button>
              </>
            }
            title="Manager's Message"
            trigger="click"
            visible={isPopVisible}
            onVisibleChange={(visible) => setIsPopVisible(visible)}
          >
            <Button type="link">View Manager's Message</Button>
          </Popover>

          {/* Other Routes */}
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
