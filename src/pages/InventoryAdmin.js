import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const { Title, Text } = Typography;
const { TextArea } = Input;

const normalizeInventoryItem = (id, data = {}) => ({
  id,
  name: data.name || "",
  category: data.category || "",
  supplier: data.supplier || "",
  units: data.units || "",
  notes: data.notes || "",
  par: Number.isFinite(data.par) ? data.par : Number(data.par || 0),
  current: Number.isFinite(data.current)
    ? data.current
    : Number(data.current || 0),
});

const InventoryItemsTab = ({ categories, suppliers, refreshLists }) => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadItems = async (preferredId = null) => {
    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "inventory"));
      const loaded = snapshot.docs
        .map((itemDoc) => normalizeInventoryItem(itemDoc.id, itemDoc.data()))
        .sort((a, b) => a.name.localeCompare(b.name));

      setItems(loaded);

      const nextId =
        preferredId && loaded.some((item) => item.id === preferredId)
          ? preferredId
          : loaded[0]?.id || null;

      setSelectedId(nextId);

      if (nextId) {
        form.setFieldsValue(loaded.find((item) => item.id === nextId));
      } else {
        form.resetFields();
        form.setFieldsValue({
          name: "",
          category: "",
          supplier: "",
          units: "",
          notes: "",
          par: 0,
          current: 0,
        });
      }
    } catch (error) {
      console.error(error);
      message.error("Inventory items could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, searchText]);

  const openItem = (item) => {
    setSelectedId(item.id);
    form.setFieldsValue(item);
  };

  const newItem = () => {
    setSelectedId(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      category: "",
      supplier: "",
      units: "",
      notes: "",
      par: 0,
      current: 0,
    });
  };

  const saveItem = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        name: values.name.trim(),
        category: values.category || "",
        supplier: values.supplier || "",
        units: values.units || "",
        notes: values.notes || "",
        par: Number(values.par || 0),
      };

      setSaving(true);

      if (selectedId) {
        await updateDoc(doc(db, "inventory", selectedId), payload);
        message.success("Inventory item saved.");
        await loadItems(selectedId);
      } else {
        const newDoc = await addDoc(collection(db, "inventory"), {
          ...payload,
          current: 0,
        });
        message.success("Inventory item created.");
        await loadItems(newDoc.id);
      }

      await refreshLists();
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error("The inventory item could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateItem = async () => {
    try {
      const values = await form.validateFields();
      const newDoc = await addDoc(collection(db, "inventory"), {
        name: `${values.name.trim()} Copy`,
        category: values.category || "",
        supplier: values.supplier || "",
        units: values.units || "",
        notes: values.notes || "",
        par: Number(values.par || 0),
        current: 0,
      });

      message.success("Inventory item duplicated.");
      await loadItems(newDoc.id);
      await refreshLists();
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error("The inventory item could not be duplicated.");
    }
  };

  const removeItem = () => {
    if (!selectedId) return;

    const currentItem = items.find((item) => item.id === selectedId);

    Modal.confirm({
      title: `Delete "${currentItem?.name || "this item"}"?`,
      content: "This permanently deletes the inventory item.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "inventory", selectedId));
        message.success("Inventory item deleted.");
        await loadItems();
        await refreshLists();
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={7}>
        <Card
          title="Inventory Items"
          extra={
            <Button type="primary" onClick={newItem}>
              New Item
            </Button>
          }
        >
          <Input.Search
            allowClear
            placeholder="Search items"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ marginBottom: 12 }}
          />

          {filteredItems.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              size="small"
              dataSource={filteredItems}
              style={{ maxHeight: "60vh", overflowY: "auto" }}
              renderItem={(item) => (
                <List.Item
                  onClick={() => openItem(item)}
                  style={{
                    cursor: "pointer",
                    padding: "10px 12px",
                    borderRadius: 6,
                    background:
                      item.id === selectedId ? "#e6f4ff" : "transparent",
                  }}
                >
                  <div>
                    <Text strong={item.id === selectedId}>{item.name}</Text>
                    <br />
                    <Text type="secondary">{item.category}</Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} lg={17}>
        <Card>
          <Title level={3} style={{ marginTop: 0 }}>
            {selectedId ? "Edit Inventory Item" : "New Inventory Item"}
          </Title>

          <Form form={form} layout="vertical">
            <Form.Item
              label="Item Name"
              name="name"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Category" name="category">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Select category"
                    options={categories.map((name) => ({
                      label: name,
                      value: name,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Supplier" name="supplier">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Select supplier"
                    options={suppliers.map((name) => ({
                      label: name,
                      value: name,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Par" name="par">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Units" name="units">
                  <Input placeholder="Bottle, case, bag..." />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Current On Hand"
                  name="current"
                  extra="Updated on the regular Inventory page."
                >
                  <InputNumber disabled style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Notes" name="notes">
              <TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
            </Form.Item>

            <Divider />

            <Space wrap>
              <Button type="primary" loading={saving} onClick={saveItem}>
                {selectedId ? "Save Item" : "Create Item"}
              </Button>
              <Button onClick={duplicateItem}>Duplicate</Button>
              <Button danger disabled={!selectedId} onClick={removeItem}>
                Delete
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

const SimpleListManager = ({
  title,
  collectionName,
  fieldName,
  values,
  reload,
  usageField,
}) => {
  const [newValue, setNewValue] = useState("");

  const addValue = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    if (values.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      message.warning(`${title.slice(0, -1)} already exists.`);
      return;
    }

    await addDoc(collection(db, collectionName), {
      [fieldName]: trimmed,
    });

    setNewValue("");
    await reload();
    message.success(`${title.slice(0, -1)} added.`);
  };

  const renameValue = (record) => {
    let nextValue = record.value;

    Modal.confirm({
      title: `Rename ${title.slice(0, -1)}`,
      content: (
        <Input
          defaultValue={record.value}
          onChange={(event) => {
            nextValue = event.target.value;
          }}
        />
      ),
      okText: "Save",
      onOk: async () => {
        const trimmed = nextValue.trim();
        if (!trimmed) return Promise.reject();

        await updateDoc(doc(db, collectionName, record.id), {
          [fieldName]: trimmed,
        });

        if (usageField) {
          const inventorySnapshot = await getDocs(collection(db, "inventory"));
          const updates = inventorySnapshot.docs
            .filter((itemDoc) => itemDoc.data()[usageField] === record.value)
            .map((itemDoc) =>
              updateDoc(doc(db, "inventory", itemDoc.id), {
                [usageField]: trimmed,
              })
            );
          await Promise.all(updates);
        }

        await reload();
        message.success(`${title.slice(0, -1)} renamed.`);
      },
    });
  };

  const deleteValue = (record) => {
    Modal.confirm({
      title: `Delete "${record.value}"?`,
      content:
        "Existing inventory items will keep their current text value unless you change them.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, collectionName, record.id));
        await reload();
        message.success(`${title.slice(0, -1)} deleted.`);
      },
    });
  };

  return (
    <Card title={title}>
      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Input
          value={newValue}
          placeholder={`New ${title.slice(0, -1).toLowerCase()}`}
          onChange={(event) => setNewValue(event.target.value)}
          onPressEnter={addValue}
        />
        <Button type="primary" onClick={addValue}>
          Add
        </Button>
      </Space.Compact>

      <List
        bordered
        dataSource={values}
        locale={{ emptyText: `No ${title.toLowerCase()} yet` }}
        renderItem={(record) => (
          <List.Item
            actions={[
              <Button key="rename" type="link" onClick={() => renameValue(record)}>
                Rename
              </Button>,
              <Button
                key="delete"
                type="link"
                danger
                onClick={() => deleteValue(record)}
              >
                Delete
              </Button>,
            ]}
          >
            {record.value}
          </List.Item>
        )}
      />
    </Card>
  );
};

const ReportRecipientsTab = () => {
  const [form] = Form.useForm();
  const [recipients, setRecipients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRecipients = async (preferredId = null) => {
    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "managers"));
      const loaded = snapshot.docs
        .map((recipientDoc) => ({
          id: recipientDoc.id,
          name: recipientDoc.data().name || "",
          email: recipientDoc.data().email || "",
          phone: recipientDoc.data().phone || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setRecipients(loaded);

      const nextId =
        preferredId && loaded.some((item) => item.id === preferredId)
          ? preferredId
          : loaded[0]?.id || null;

      setSelectedId(nextId);

      if (nextId) {
        form.setFieldsValue(loaded.find((item) => item.id === nextId));
      } else {
        form.resetFields();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRecipient = async () => {
    const values = await form.validateFields();

    if (selectedId) {
      await updateDoc(doc(db, "managers", selectedId), values);
      message.success("Recipient saved.");
      await loadRecipients(selectedId);
    } else {
      const newDoc = await addDoc(collection(db, "managers"), values);
      message.success("Recipient added.");
      await loadRecipients(newDoc.id);
    }
  };

  const deleteRecipient = () => {
    if (!selectedId) return;

    Modal.confirm({
      title: "Delete this report recipient?",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "managers", selectedId));
        await loadRecipients();
        message.success("Recipient deleted.");
      },
    });
  };

  if (loading) return <Spin />;

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={8}>
        <Card
          title="Report Recipients"
          extra={
            <Button
              type="primary"
              onClick={() => {
                setSelectedId(null);
                form.resetFields();
              }}
            >
              New
            </Button>
          }
        >
          <List
            dataSource={recipients}
            locale={{ emptyText: "No recipients" }}
            renderItem={(recipient) => (
              <List.Item
                onClick={() => {
                  setSelectedId(recipient.id);
                  form.setFieldsValue(recipient);
                }}
                style={{
                  cursor: "pointer",
                  background:
                    recipient.id === selectedId ? "#e6f4ff" : "transparent",
                  padding: "10px 12px",
                  borderRadius: 6,
                }}
              >
                <div>
                  <Text strong>{recipient.name}</Text>
                  <br />
                  <Text type="secondary">{recipient.email}</Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} lg={16}>
        <Card title={selectedId ? "Edit Recipient" : "New Recipient"}>
          <Form form={form} layout="vertical">
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Enter an email address." },
                { type: "email", message: "Enter a valid email address." },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Phone" name="phone">
              <Input />
            </Form.Item>

            <Space>
              <Button type="primary" onClick={saveRecipient}>
                {selectedId ? "Save" : "Add"}
              </Button>
              <Button danger disabled={!selectedId} onClick={deleteRecipient}>
                Delete
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

const InventoryAdmin = () => {
  const [categoryRecords, setCategoryRecords] = useState([]);
  const [supplierRecords, setSupplierRecords] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const loadManagedLists = async () => {
    setLoadingLists(true);

    try {
      const [categorySnapshot, supplierSnapshot] = await Promise.all([
        getDocs(collection(db, "inventoryCategories")),
        getDocs(collection(db, "inventorySuppliers")),
      ]);

      setCategoryRecords(
        categorySnapshot.docs
          .map((itemDoc) => ({
            id: itemDoc.id,
            value: itemDoc.data().name || "",
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.value.localeCompare(b.value))
      );

      setSupplierRecords(
        supplierSnapshot.docs
          .map((itemDoc) => ({
            id: itemDoc.id,
            value: itemDoc.data().name || "",
          }))
          .filter((item) => item.value)
          .sort((a, b) => a.value.localeCompare(b.value))
      );
    } finally {
      setLoadingLists(false);
    }
  };

  const importExistingValues = async () => {
    const snapshot = await getDocs(collection(db, "inventory"));
    const categories = new Set();
    const suppliers = new Set();

    snapshot.docs.forEach((itemDoc) => {
      const data = itemDoc.data();
      if (data.category?.trim()) categories.add(data.category.trim());
      if (data.supplier?.trim()) suppliers.add(data.supplier.trim());
    });

    const existingCategories = new Set(
      categoryRecords.map((record) => record.value.toLowerCase())
    );
    const existingSuppliers = new Set(
      supplierRecords.map((record) => record.value.toLowerCase())
    );

    const writes = [];

    categories.forEach((name) => {
      if (!existingCategories.has(name.toLowerCase())) {
        writes.push(addDoc(collection(db, "inventoryCategories"), { name }));
      }
    });

    suppliers.forEach((name) => {
      if (!existingSuppliers.has(name.toLowerCase())) {
        writes.push(addDoc(collection(db, "inventorySuppliers"), { name }));
      }
    });

    await Promise.all(writes);
    await loadManagedLists();
    message.success("Existing categories and suppliers imported.");
  };

  useEffect(() => {
    loadManagedLists();
  }, []);

  if (loadingLists) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const categoryNames = categoryRecords.map((record) => record.value);
  const supplierNames = supplierRecords.map((record) => record.value);

  const tabItems = [
    {
      key: "items",
      label: "Inventory Items",
      children: (
        <InventoryItemsTab
          categories={categoryNames}
          suppliers={supplierNames}
          refreshLists={loadManagedLists}
        />
      ),
    },
    {
      key: "categories",
      label: "Categories",
      children: (
        <SimpleListManager
          title="Categories"
          collectionName="inventoryCategories"
          fieldName="name"
          values={categoryRecords}
          reload={loadManagedLists}
          usageField="category"
        />
      ),
    },
    {
      key: "suppliers",
      label: "Suppliers",
      children: (
        <SimpleListManager
          title="Suppliers"
          collectionName="inventorySuppliers"
          fieldName="name"
          values={supplierRecords}
          reload={loadManagedLists}
          usageField="supplier"
        />
      ),
    },
    {
      key: "recipients",
      label: "Report Recipients",
      children: <ReportRecipientsTab />,
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Inventory Administration
          </Title>
          <Text type="secondary">
            Current on-hand quantities remain editable only on the regular Inventory page.
          </Text>
        </div>

        <Button onClick={importExistingValues}>
          Import Existing Categories and Suppliers
        </Button>
      </div>

      <Tabs items={tabItems} />
    </div>
  );
};

export default InventoryAdmin;
