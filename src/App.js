import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import { Layout, Menu, Button, Popover } from "antd";
import routes from "./pages/routes";
import { doc, getDoc } from "firebase/firestore"; // Firestore methods
import { db } from "./firebase/firebase";
import moment from "moment"; // To manage timestamps easily

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
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(""); // Default to empty string
  const [timestamp, setTimestamp] = useState(null); // Default to null
  const popoverContentRef = useRef(null);
  const timeoutRef = useRef(null); // Reference for the timeout

  // Fetch manager message from Firestore
  const fetchData = async () => {
    try {
      const docRef = doc(db, "managerMessages", "currentMessage");
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        setMessage(docSnapshot.data().message || ""); // Fallback to empty string
        setTimestamp(docSnapshot.data().timestamp || moment()); // Fallback to current moment
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching manager message: ", error);
    }
  };

  useEffect(() => {
    const checkVisibility = () => {
      if (timestamp) {
        const now = moment();
        const diffInSeconds = now.diff(moment(timestamp), "seconds");

        if (diffInSeconds >= 3600) {
          fetchData();
          setVisible(true); // Show the Popover
        } else {
          timeoutRef.current = setTimeout(
            checkVisibility,
            (3600 - diffInSeconds) * 1000
          ); // Wait remaining seconds
        }
      } else {
        const newTimestamp = moment();
        setTimestamp(newTimestamp);
      }
    };

    checkVisibility();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clean up timeouts
      }
    };
  }, [timestamp]);

  useEffect(() => {
    if (visible && popoverContentRef.current) {
      popoverContentRef.current.focus();
    }
  }, [visible]);

  const closePopover = () => {
    setVisible(false);
    setTimestamp(moment()); // Reset timestamp when closed
  };

  // Popover content (manager's message)
  const popoverContent = (
    <div
      ref={popoverContentRef}
      tabIndex={-1} // Makes the div focusable
      style={{ outline: "none" }} // Optional: Remove focus outline
    >
      <div
        dangerouslySetInnerHTML={{
          __html: message || "No message available.", // Provide default message
        }}
      />
      <Button onClick={closePopover}>Close</Button>
    </div>
  );

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
        <AppHeader toggleSider={() => setCollapsed(!collapsed)} />

        <Popover
          content={popoverContent}
          title="Manager's Message"
          open={visible}
          onOpenChange={(newVisible) => {
            setVisible(newVisible);
            if (!newVisible) {
              setTimestamp(moment()); // Reset timestamp when closed
            }
          }}
          placement="top"
          trigger="click" // Ensure clicking outside closes it
          overlayStyle={{
            maxWidth: "80vw", // Smaller than screen width
            margin: "0 auto", // Centered
          }}
        />

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
