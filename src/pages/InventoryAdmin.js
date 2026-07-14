import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Collapse,
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

const blankInventoryItem = (category = "") => ({
  name: "",
  category,
  supplier: "",
  units: "",
  notes: "",
  par: 0,
  current: 0,
});

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

const InventorySetupTab = ({
  categoryRecords,
  supplierRecords,
  reloadCategoriesAndSuppliers,
}) => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);
  const listScrollRef = useRef(null);
  const pendingScrollTopRef = useRef(null);

  const categoryNames = categoryRecords.map((record) => record.value);
  const supplierNames = supplierRecords.map((record) => record.value);

  const loadItems = async (preferredId = null) => {
    if (listScrollRef.current) {
      pendingScrollTopRef.current = listScrollRef.current.scrollTop;
    }

    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "inventory"));
      const loaded = snapshot.docs
        .map((itemDoc) => normalizeInventoryItem(itemDoc.id, itemDoc.data()))
        .sort((a, b) => {
          const categoryCompare = a.category.localeCompare(b.category);
          return categoryCompare || a.name.localeCompare(b.name);
        });

      setItems(loaded);

      const nextId =
        preferredId && loaded.some((item) => item.id === preferredId)
          ? preferredId
          : loaded[0]?.id || null;

      setSelectedId(nextId);

      if (nextId) {
        form.setFieldsValue(loaded.find((item) => item.id === nextId));
      } else {
        form.setFieldsValue(blankInventoryItem());
      }

      window.requestAnimationFrame(() => {
        if (
          listScrollRef.current &&
          pendingScrollTopRef.current !== null
        ) {
          listScrollRef.current.scrollTop =
            pendingScrollTopRef.current;
          pendingScrollTopRef.current = null;
        }
      });
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

  const openItem = (item) => {
    setSelectedId(item.id);
    form.setFieldsValue(item);

    if (window.innerWidth < 992) {
      window.setTimeout(() => {
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  };

  const newItem = (category = "") => {
    setSelectedId(null);
    form.resetFields();
    form.setFieldsValue(blankInventoryItem(category));
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
      },
    });
  };

  const addCategory = () => {
    let categoryName = "";

    Modal.confirm({
      title: "New Category",
      content: (
        <Input
          autoFocus
          placeholder="Category name"
          onChange={(event) => {
            categoryName = event.target.value;
          }}
        />
      ),
      okText: "Add Category",
      onOk: async () => {
        const trimmed = categoryName.trim();

        if (!trimmed) {
          message.warning("Enter a category name.");
          return Promise.reject();
        }

        if (
          categoryRecords.some(
            (record) => record.value.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          message.warning("That category already exists.");
          return Promise.reject();
        }

        await addDoc(collection(db, "inventoryCategories"), {
          name: trimmed,
        });

        await reloadCategoriesAndSuppliers();
        message.success("Category added.");
      },
    });
  };

  const renameCategory = (record) => {
    let nextName = record.value;

    Modal.confirm({
      title: `Rename "${record.value}"`,
      content: (
        <Input
          defaultValue={record.value}
          onChange={(event) => {
            nextName = event.target.value;
          }}
        />
      ),
      okText: "Rename",
      onOk: async () => {
        const trimmed = nextName.trim();

        if (!trimmed) {
          message.warning("Enter a category name.");
          return Promise.reject();
        }

        await updateDoc(doc(db, "inventoryCategories", record.id), {
          name: trimmed,
        });

        const affectedItems = items.filter(
          (item) => item.category === record.value
        );

        await Promise.all(
          affectedItems.map((item) =>
            updateDoc(doc(db, "inventory", item.id), {
              category: trimmed,
            })
          )
        );

        await Promise.all([
          reloadCategoriesAndSuppliers(),
          loadItems(selectedId),
        ]);

        message.success("Category renamed.");
      },
    });
  };

  const deleteCategory = (record) => {
    const usedBy = items.filter((item) => item.category === record.value);

    if (usedBy.length > 0) {
      message.warning(
        `Move or delete the ${usedBy.length} item(s) in this category first.`
      );
      return;
    }

    Modal.confirm({
      title: `Delete "${record.value}"?`,
      content: "This deletes the category from Inventory Setup.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "inventoryCategories", record.id));
        await reloadCategoriesAndSuppliers();
        message.success("Category deleted.");
      },
    });
  };

  const groupedItems = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

    return categoryRecords.map((category) => {
      const categoryItems = items
        .filter((item) => item.category === category.value)
        .filter((item) => {
          if (!needle) return true;
          return item.name.toLowerCase().includes(needle);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        category,
        items: categoryItems,
      };
    });
  }, [categoryRecords, items, searchText]);

  const uncategorizedItems = useMemo(() => {
    const managedCategories = new Set(categoryNames);
    const needle = searchText.trim().toLowerCase();

    return items
      .filter(
        (item) =>
          !item.category || !managedCategories.has(item.category)
      )
      .filter((item) => {
        if (!needle) return true;
        return item.name.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryNames, items, searchText]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const collapseItems = groupedItems.map(({ category, items: categoryItems }) => ({
    key: category.id,
    label: (
      <Text strong>{category.value}</Text>
    ),
    extra: (
      <Space
        onClick={(event) => event.stopPropagation()}
        wrap
      >
        <Button size="small" onClick={() => newItem(category.value)}>
          Add Item
        </Button>
        <Button size="small" onClick={() => renameCategory(category)}>
          Rename
        </Button>
        <Button
          size="small"
          danger
          onClick={() => deleteCategory(category)}
        >
          Delete
        </Button>
      </Space>
    ),
    children:
      categoryItems.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No items in this category"
        />
      ) : (
        <List
          size="small"
          dataSource={categoryItems}
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
              {item.name}
            </List.Item>
          )}
        />
      ),
  }));

  if (uncategorizedItems.length > 0) {
    collapseItems.push({
      key: "uncategorized",
      label: <Text strong>Uncategorized</Text>,
      children: (
        <List
          size="small"
          dataSource={uncategorizedItems}
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
              {item.name}
            </List.Item>
          )}
        />
      ),
    });
  }

  return (
    <Row gutter={[20, 20]} align="top">
      <Col xs={24} lg={9}>
        <Card
          title="Inventory Setup"
          extra={
            <Space>
              <Button onClick={addCategory}>New Category</Button>
              <Button type="primary" onClick={() => newItem()}>
                New Item
              </Button>
            </Space>
          }
        >
          <div
            ref={listScrollRef}
            style={{
              maxHeight: "calc(100vh - 230px)",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
          <Input.Search
            allowClear
            placeholder="Search inventory items"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ marginBottom: 16 }}
          />

          {collapseItems.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Create a category to get started"
            />
          ) : (
            <Collapse
              items={collapseItems}
              defaultActiveKey={collapseItems.map((item) => item.key)}
            />
          )}
          </div>
        </Card>
      </Col>

      <Col xs={24} lg={15}>
        <div
          ref={editorRef}
          style={{
            position: "sticky",
            top: 84,
            scrollMarginTop: 84,
          }}
        >
          <Card>
          <Title level={3} style={{ marginTop: 0 }}>
            {selectedId ? "Edit Inventory Item" : "New Inventory Item"}
          </Title>

          <Form form={form} layout="vertical">
            <Form.Item
              label="Item Name"
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Enter an item name.",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Category"
                  name="category"
                  rules={[
                    {
                      required: true,
                      message: "Select a category.",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    placeholder="Select category"
                    options={categoryNames.map((name) => ({
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
                    options={supplierNames.map((name) => ({
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
              <Button
                type="primary"
                loading={saving}
                onClick={saveItem}
              >
                {selectedId ? "Save Item" : "Create Item"}
              </Button>
              <Button onClick={duplicateItem}>Duplicate</Button>
              <Button
                danger
                disabled={!selectedId}
                onClick={removeItem}
              >
                Delete
              </Button>
            </Space>
          </Form>
          </Card>
        </div>
      </Col>
    </Row>
  );
};

const SuppliersTab = ({ supplierRecords, reload }) => {
  const [newSupplier, setNewSupplier] = useState("");

  const addSupplier = async () => {
    const trimmed = newSupplier.trim();
    if (!trimmed) return;

    if (
      supplierRecords.some(
        (record) => record.value.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      message.warning("That supplier already exists.");
      return;
    }

    await addDoc(collection(db, "inventorySuppliers"), {
      name: trimmed,
    });

    setNewSupplier("");
    await reload();
    message.success("Supplier added.");
  };

  const renameSupplier = (record) => {
    let nextName = record.value;

    Modal.confirm({
      title: `Rename "${record.value}"`,
      content: (
        <Input
          defaultValue={record.value}
          onChange={(event) => {
            nextName = event.target.value;
          }}
        />
      ),
      okText: "Rename",
      onOk: async () => {
        const trimmed = nextName.trim();
        if (!trimmed) return Promise.reject();

        await updateDoc(doc(db, "inventorySuppliers", record.id), {
          name: trimmed,
        });

        const snapshot = await getDocs(collection(db, "inventory"));
        const affected = snapshot.docs.filter(
          (itemDoc) => itemDoc.data().supplier === record.value
        );

        await Promise.all(
          affected.map((itemDoc) =>
            updateDoc(doc(db, "inventory", itemDoc.id), {
              supplier: trimmed,
            })
          )
        );

        await reload();
        message.success("Supplier renamed.");
      },
    });
  };

  const deleteSupplier = (record) => {
    Modal.confirm({
      title: `Delete "${record.value}"?`,
      content:
        "Existing inventory items will retain this supplier until edited.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "inventorySuppliers", record.id));
        await reload();
        message.success("Supplier deleted.");
      },
    });
  };

  return (
    <Card title="Suppliers">
      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Input
          value={newSupplier}
          placeholder="New supplier"
          onChange={(event) => setNewSupplier(event.target.value)}
          onPressEnter={addSupplier}
        />
        <Button type="primary" onClick={addSupplier}>
          Add
        </Button>
      </Space.Compact>

      <List
        bordered
        dataSource={supplierRecords}
        locale={{ emptyText: "No suppliers yet" }}
        renderItem={(record) => (
          <List.Item
            actions={[
              <Button
                key="rename"
                type="link"
                onClick={() => renameSupplier(record)}
              >
                Rename
              </Button>,
              <Button
                key="delete"
                type="link"
                danger
                onClick={() => deleteSupplier(record)}
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
              <Button
                danger
                disabled={!selectedId}
                onClick={deleteRecipient}
              >
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

  const loadCategoriesAndSuppliers = async () => {
    setLoadingLists(true);

    try {
      const [categorySnapshot, supplierSnapshot] = await Promise.all([
        getDocs(collection(db, "inventoryCategories")),
        getDocs(collection(db, "inventorySuppliers")),
      ]);

      let categories = categorySnapshot.docs
        .map((itemDoc) => ({
          id: itemDoc.id,
          value: itemDoc.data().name || "",
        }))
        .filter((item) => item.value);

      if (categories.length === 0) {
        const inventorySnapshot = await getDocs(collection(db, "inventory"));
        const existingNames = [
          ...new Set(
            inventorySnapshot.docs
              .map((itemDoc) => String(itemDoc.data().category || "").trim())
              .filter(Boolean)
          ),
        ];

        await Promise.all(
          existingNames.map((name) =>
            addDoc(collection(db, "inventoryCategories"), { name })
          )
        );

        const refreshedCategories = await getDocs(
          collection(db, "inventoryCategories")
        );

        categories = refreshedCategories.docs
          .map((itemDoc) => ({
            id: itemDoc.id,
            value: itemDoc.data().name || "",
          }))
          .filter((item) => item.value);
      }

      setCategoryRecords(
        categories.sort((a, b) => a.value.localeCompare(b.value))
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

  useEffect(() => {
    loadCategoriesAndSuppliers();
  }, []);

  if (loadingLists) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: "inventory",
      label: "Inventory Setup",
      children: (
        <InventorySetupTab
          categoryRecords={categoryRecords}
          supplierRecords={supplierRecords}
          reloadCategoriesAndSuppliers={loadCategoriesAndSuppliers}
        />
      ),
    },
    {
      key: "suppliers",
      label: "Suppliers",
      children: (
        <SuppliersTab
          supplierRecords={supplierRecords}
          reload={loadCategoriesAndSuppliers}
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
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          Inventory Administration
        </Title>
        <Text type="secondary">
          Configure inventory items, categories, suppliers, and report recipients.
        </Text>
      </div>

      <Tabs items={tabItems} />
    </div>
  );
};

export default InventoryAdmin;
