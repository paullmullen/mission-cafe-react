import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";

const { Title, Text } = Typography;
const SESSION_KEY = "missionCafeAdminUnlocked";

const AdminGuard = ({ children }) => {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  const handleUnlock = ({ accessCode }) => {
    const configuredCode = process.env.REACT_APP_MANAGER_ACCESS_CODE;

    if (!configuredCode) {
      message.error(
        "Admin access is not configured. Add REACT_APP_MANAGER_ACCESS_CODE to the project .env file."
      );
      return;
    }

    if (accessCode !== configuredCode) {
      message.error("That access code is not correct.");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "true");
    setUnlocked(true);
    message.success("Admin unlocked.");
  };

  if (unlocked) return children;

  return (
    <div style={{ maxWidth: 460, margin: "48px auto" }}>
      <Card>
        <Title level={3} style={{ marginTop: 0 }}>
          Admin Access
        </Title>

        <Text type="secondary">
          Enter the shared admin access code to continue.
        </Text>

        <Alert
          type="info"
          showIcon
          message="Access remains unlocked until this browser session is closed."
          style={{ margin: "20px 0" }}
        />

        <Form layout="vertical" onFinish={handleUnlock}>
          <Form.Item
            label="Access Code"
            name="accessCode"
            rules={[{ required: true, message: "Enter the admin access code." }]}
          >
            <Input.Password autoFocus />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Unlock Admin
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export const lockAdminSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export default AdminGuard;
