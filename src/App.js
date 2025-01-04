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
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore"; // Firebase methods
import { db } from "./firebase/firebase";
import moment from "moment"; // To manage timestamps easily
import styled from "styled-components"; // For styled components

const { Header, Sider, Content } = Layout;

// Styled Component for the warning capsule
const WarningCapsule = styled(Link)`
  background-color: red;
  color: white;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  line-height: 40px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: darkred;
  }
`;

const AppHeader = ({ toggleSider, maintenanceWarningVisible }) => {
  const location = useLocation();
  const route = routes.find((r) => r.path === location.pathname);
  const title = route ? route.title : "App";

  return (
    <Header
      style={{
        position: "fixed",
        top: 0,
        width: "100%",
        background: "#fff",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Button
        type="text"
        icon={<span style={{ fontSize: "24px" }}>☰</span>}
        onClick={toggleSider}
        style={{ fontSize: "24px", marginRight: 16 }}
      />
      <span style={{ fontSize: "24px", fontWeight: "bold" }}>{title}</span>

      {/* Render warning if maintenance tasks are due */}
      {maintenanceWarningVisible && (
        <WarningCapsule to="/maintenance">
          Maintenance Items are Due
        </WarningCapsule>
      )}
    </Header>
  );
};

const App = () => {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [timestamp, setTimestamp] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [maintenanceWarningVisible, setMaintenanceWarningVisible] =
    useState(false);
  const popoverContentRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fetch manager message from Firestore
  const fetchData = async () => {
    try {
      const docRef = doc(db, "managerMessages", "currentMessage");
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        setMessage(docSnapshot.data().message || "");
        setTimestamp(docSnapshot.data().timestamp || moment());
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching manager message: ", error);
    }
  };

  // Fetch maintenance data from Firestore
  const fetchMaintenanceData = async () => {
    try {
      const q = query(collection(db, "maintenance"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMaintenanceData(data);
      checkForMaintenanceDue(data);
    } catch (error) {
      console.error("Error fetching maintenance data: ", error);
    }
  };

  // Check if any maintenance tasks are overdue or due
  const checkForMaintenanceDue = (tasks) => {
    let dueFound = false;
    tasks.forEach((task) => {
      const status = calculateTaskStatus(
        task.completed?.[task.completed.length - 1]?.date,
        task.intervalDays
      );
      if (status === "Due" || status === "Overdue") {
        dueFound = true;
      }
    });
    setMaintenanceWarningVisible(dueFound);
  };

  // Calculate the task status based on interval and last completed date
  const calculateTaskStatus = (lastPerformedDate, intervalDays) => {
    if (!lastPerformedDate) return "Not yet performed";

    const lastDate = new Date(lastPerformedDate.seconds * 1000);
    const nextDueDate = new Date(lastDate);
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);

    const today = new Date();
    const daysDifference = Math.ceil(
      (nextDueDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference > 0) return `Due in ${daysDifference} day(s)`;
    else if (daysDifference < 0) return "Overdue";
    return "Due";
  };

  // Listen for real-time updates on maintenance tasks' completion
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "maintenance"),
      (snapshot) => {
        const tasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMaintenanceData(tasks);
        checkForMaintenanceDue(tasks); // Recheck if maintenance tasks are due
      }
    );

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Handle popover visibility for manager message
  useEffect(() => {
    const checkVisibility = () => {
      if (timestamp) {
        const now = moment();
        const diffInSeconds = now.diff(moment(timestamp), "seconds");

        if (diffInSeconds >= 3600) {
          fetchData();
          setVisible(true);
        } else {
          timeoutRef.current = setTimeout(
            checkVisibility,
            (3600 - diffInSeconds) * 1000
          );
        }
      } else {
        const newTimestamp = moment();
        setTimestamp(newTimestamp);
      }
    };

    checkVisibility();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Cleanup timeout
      }
    };
  }, [timestamp]);

  // Initial maintenance data fetch
  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  // Focus on popover content when it's visible
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
      tabIndex={-1}
      style={{ outline: "none", fontSize: "1.5rem" }}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: message || "No message available.",
        }}
      />
      <Button onClick={closePopover}>Close</Button>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        collapsedWidth={0}
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          height: "calc(100vh - 64px)",
          background: "#001529",
          zIndex: 1000,
          overflow: "hidden",
        }}
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

      <Layout>
        <AppHeader
          toggleSider={() => setCollapsed(!collapsed)}
          maintenanceWarningVisible={maintenanceWarningVisible}
        />

        <Popover
          content={popoverContent}
          title="Manager's Message"
          open={visible}
          onOpenChange={(newVisible) => {
            setVisible(newVisible);
            if (!newVisible) {
              setTimestamp(moment());
            }
          }}
          placement="top"
          trigger="click"
          overlayStyle={{
            maxWidth: "80vw",
            margin: "0 auto",
          }}
        />

        <Content style={{ padding: "20px", marginTop: "64px" }}>
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
