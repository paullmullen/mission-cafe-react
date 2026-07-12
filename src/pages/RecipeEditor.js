import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
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
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { UploadOutlined } from "@ant-design/icons";
import { db, storage } from "../firebase/firebase";

const { Title, Text } = Typography;
const { TextArea } = Input;

const COLLECTION_NAME = "mission-cafe";

const blankIngredient = () => ({
  ingredientName: "",
  ingredientSizes: "",
  ingredientAmounts: "",
});

const blankInstruction = () => ({
  type: "text",
  text: "",
});

const blankRecipe = () => ({
  name: "",
  temperature: "hot",
  image: "",
  prep: "",
  ingredients: [blankIngredient()],
  instructions: [blankInstruction()],
});

const normalizeRecipe = (id, data = {}) => ({
  id,
  name: data.name || "",
  temperature: data.temperature || "hot",
  image: data.image || "",
  prep: data.prep || "",
  ingredients:
    Array.isArray(data.ingredients) && data.ingredients.length > 0
      ? data.ingredients.map((ingredient) => ({
          ingredientName: ingredient?.ingredientName || "",
          ingredientSizes: ingredient?.ingredientSizes || "",
          ingredientAmounts: ingredient?.ingredientAmounts || "",
        }))
      : [blankIngredient()],
  instructions:
    Array.isArray(data.instructions) && data.instructions.length > 0
      ? data.instructions.map((instruction) => ({
          type: instruction?.type || "text",
          text: instruction?.text || "",
        }))
      : [blankInstruction()],
});

const RecipeEditor = () => {
  const [form] = Form.useForm();
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedId) || null,
    [recipes, selectedId]
  );

  const filteredRecipes = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

    if (!needle) return recipes;

    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(needle)
    );
  }, [recipes, searchText]);

  const loadRecipes = async (preferredId = null) => {
    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const loaded = snapshot.docs
        .map((recipeDoc) =>
          normalizeRecipe(recipeDoc.id, recipeDoc.data())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      setRecipes(loaded);

      const nextId =
        preferredId && loaded.some((recipe) => recipe.id === preferredId)
          ? preferredId
          : loaded[0]?.id || null;

      setSelectedId(nextId);

      if (nextId) {
        const nextRecipe = loaded.find((recipe) => recipe.id === nextId);
        form.setFieldsValue(nextRecipe);
      } else {
        form.setFieldsValue(blankRecipe());
      }

      setDirty(false);
    } catch (error) {
      console.error("Error loading recipes:", error);
      message.error("The recipes could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRecipe = (recipe) => {
    const switchRecipe = () => {
      setSelectedId(recipe.id);
      form.setFieldsValue(recipe);
      setDirty(false);
    };

    if (!dirty) {
      switchRecipe();
      return;
    }

    Modal.confirm({
      title: "Discard unsaved changes?",
      content:
        "You have changes that have not been saved. They will be lost if you open another recipe.",
      okText: "Discard Changes",
      cancelText: "Keep Editing",
      okButtonProps: { danger: true },
      onOk: switchRecipe,
    });
  };

  const startNewRecipe = () => {
    const createNew = () => {
      setSelectedId(null);
      form.resetFields();
      form.setFieldsValue(blankRecipe());
      setDirty(false);
    };

    if (!dirty) {
      createNew();
      return;
    }

    Modal.confirm({
      title: "Discard unsaved changes?",
      content:
        "You have changes that have not been saved. They will be lost if you start a new recipe.",
      okText: "Discard Changes",
      cancelText: "Keep Editing",
      okButtonProps: { danger: true },
      onOk: createNew,
    });
  };

  const cleanValues = (values) => ({
    name: (values.name || "").trim(),
    temperature: values.temperature || "hot",
    image: (values.image || "").trim(),
    prep: values.prep || "",
    ingredients: (values.ingredients || []).map((ingredient) => ({
      ingredientName: ingredient?.ingredientName || "",
      ingredientSizes: ingredient?.ingredientSizes || "",
      ingredientAmounts: ingredient?.ingredientAmounts || "",
    })),
    instructions: (values.instructions || []).map((instruction) => ({
      type: instruction?.type || "text",
      text: instruction?.text || "",
    })),
  });

  const saveRecipe = async () => {
    try {
      const values = await form.validateFields();
      const payload = cleanValues(values);

      setSaving(true);

      if (selectedId) {
        await updateDoc(doc(db, COLLECTION_NAME, selectedId), payload);
        message.success("Recipe saved.");
        await loadRecipes(selectedId);
      } else {
        const newDoc = await addDoc(
          collection(db, COLLECTION_NAME),
          payload
        );
        message.success("Recipe created.");
        await loadRecipes(newDoc.id);
      }
    } catch (error) {
      if (error?.errorFields) {
        message.error("Please complete the required recipe fields.");
        return;
      }

      console.error("Error saving recipe:", error);
      message.error("The recipe could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateRecipe = async () => {
    try {
      const values = await form.validateFields();
      const payload = cleanValues(values);
      payload.name = `${payload.name} Copy`;

      setSaving(true);
      const newDoc = await addDoc(collection(db, COLLECTION_NAME), payload);
      message.success("Recipe duplicated.");
      await loadRecipes(newDoc.id);
    } catch (error) {
      if (error?.errorFields) {
        message.error("Please complete the required recipe fields.");
        return;
      }

      console.error("Error duplicating recipe:", error);
      message.error("The recipe could not be duplicated.");
    } finally {
      setSaving(false);
    }
  };

  const uploadRecipeImage = async ({ file, onSuccess, onError }) => {
    setUploadingImage(true);

    try {
      const extension = file.name?.split(".").pop() || "jpg";
      const safeName = (form.getFieldValue("name") || "recipe")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const path = `recipe-images/${safeName || "recipe"}-${Date.now()}.${extension}`;
      const imageRef = storageRef(storage, path);

      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);

      form.setFieldValue("image", url);
      setDirty(true);
      message.success("Recipe image uploaded.");
      onSuccess?.({ url });
    } catch (error) {
      console.error("Error uploading recipe image:", error);
      message.error("The image could not be uploaded.");
      onError?.(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeRecipe = () => {
    if (!selectedId || !selectedRecipe) return;

    Modal.confirm({
      title: `Delete "${selectedRecipe.name}"?`,
      content:
        "This permanently deletes the recipe from Firestore and cannot be undone.",
      okText: "Delete Recipe",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDoc(doc(db, COLLECTION_NAME, selectedId));
          message.success("Recipe deleted.");
          await loadRecipes();
        } catch (error) {
          console.error("Error deleting recipe:", error);
          message.error("The recipe could not be deleted.");
        }
      },
    });
  };

  const moveListItem = (fieldName, fromIndex, toIndex) => {
    const values = form.getFieldValue(fieldName) || [];

    if (toIndex < 0 || toIndex >= values.length) return;

    const reordered = [...values];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    form.setFieldValue(fieldName, reordered);
    setDirty(true);
  };

  const actionButtons = (
    <Space wrap>
      <Button type="primary" loading={saving} onClick={saveRecipe}>
        {selectedId ? "Save Recipe" : "Create Recipe"}
      </Button>
      <Button disabled={!form.getFieldValue("name")} onClick={duplicateRecipe}>
        Duplicate
      </Button>
      <Button danger disabled={!selectedId} onClick={removeRecipe}>
        Delete Recipe
      </Button>
    </Space>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Row gutter={[20, 20]} align="top">
      <Col xs={24} lg={7} xl={6}>
        <Card
          title="Recipes"
          extra={
            <Button type="primary" onClick={startNewRecipe}>
              New Recipe
            </Button>
          }
          styles={{ body: { padding: 12 } }}
        >
          <Input.Search
            allowClear
            placeholder="Search recipes"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ marginBottom: 12 }}
          />

          {filteredRecipes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No recipes found"
            />
          ) : (
            <List
              size="small"
              dataSource={filteredRecipes}
              style={{
                maxHeight: "calc(100vh - 260px)",
                overflowY: "auto",
              }}
              renderItem={(recipe) => (
                <List.Item
                  onClick={() => openRecipe(recipe)}
                  style={{
                    cursor: "pointer",
                    padding: "10px 12px",
                    borderRadius: 6,
                    background:
                      recipe.id === selectedId ? "#e6f4ff" : "transparent",
                  }}
                >
                  <div>
                    <Text strong={recipe.id === selectedId}>
                      {recipe.name || "Untitled Recipe"}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ textTransform: "capitalize" }}>
                      {recipe.temperature}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} lg={17} xl={18}>
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
                {selectedId ? "Edit Recipe" : "New Recipe"}
              </Title>
              <Text type="secondary">
                Fields are saved using the existing Mission Cafe recipe
                structure.
              </Text>
            </div>

            <Space direction="vertical" align="end">
              {actionButtons}
              {dirty && (
                <Alert
                  type="warning"
                  showIcon
                  message="Unsaved changes"
                  style={{ padding: "6px 12px" }}
                />
              )}
            </Space>
          </div>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            initialValues={blankRecipe()}
            onValuesChange={() => setDirty(true)}
          >
            <Row gutter={16}>
              <Col xs={24} md={16}>
                <Form.Item
                  label="Recipe Name"
                  name="name"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Enter a recipe name.",
                    },
                  ]}
                >
                  <Input placeholder="Recipe name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Temperature"
                  name="temperature"
                  rules={[{ required: true }]}
                >
                  <Radio.Group>
                    <Radio.Button value="hot">Hot</Radio.Button>
                    <Radio.Button value="cold">Cold</Radio.Button>
                    <Radio.Button value="reference">Reference</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Recipe Image">
              <Space direction="vertical" size={12}>
                <Form.Item name="image" noStyle>
                  <Input type="hidden" />
                </Form.Item>

                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const imageUrl = form.getFieldValue("image");
                    return imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt="Recipe preview"
                        width={220}
                        style={{ maxHeight: 260, objectFit: "cover", borderRadius: 8 }}
                      />
                    ) : (
                      <Text type="secondary">No image uploaded.</Text>
                    );
                  }}
                </Form.Item>

                <Upload accept="image/*" showUploadList={false} customRequest={uploadRecipeImage}>
                  <Button icon={<UploadOutlined />} loading={uploadingImage}>
                    {form.getFieldValue("image") ? "Upload New Image" : "Upload Image"}
                  </Button>
                </Upload>

                <Form.Item shouldUpdate noStyle>
                  {() =>
                    form.getFieldValue("image") ? (
                      <Button
                        type="link"
                        danger
                        style={{ padding: 0 }}
                        onClick={() => {
                          form.setFieldValue("image", "");
                          setDirty(true);
                        }}
                      >
                        Remove image from recipe
                      </Button>
                    ) : null
                  }
                </Form.Item>
              </Space>
            </Form.Item>

            <Form.Item
              label="Prep Instructions"
              name="prep"
              extra="Optional. This is the content shown by the existing Prep button."
            >
              <TextArea
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder="Optional preparation notes"
              />
            </Form.Item>

            <Divider orientation="left">Ingredients</Divider>

            <Form.List name="ingredients">
              {(fields, { add, remove }) => {
                const columns = [
                  {
                    title: "Ingredient",
                    width: "28%",
                    render: (_, field) => (
                      <Form.Item name={[field.name, "ingredientName"]} style={{ marginBottom: 0 }}>
                        <Input placeholder="Ingredient name" />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "Sizes",
                    width: "28%",
                    render: (_, field) => (
                      <Form.Item name={[field.name, "ingredientSizes"]} style={{ marginBottom: 0 }}>
                        <Input placeholder="Small, Medium, Large or All Sizes" />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "Amounts",
                    width: "30%",
                    render: (_, field) => (
                      <Form.Item name={[field.name, "ingredientAmounts"]} style={{ marginBottom: 0 }}>
                        <Input placeholder="1 tsp, 2 tsp, 3 tsp or Fill to top" />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "",
                    width: "14%",
                    render: (_, field, index) => (
                      <Space size="small">
                        <Button size="small" disabled={index === 0} onClick={() => moveListItem("ingredients", index, index - 1)}>↑</Button>
                        <Button size="small" disabled={index === fields.length - 1} onClick={() => moveListItem("ingredients", index, index + 1)}>↓</Button>
                        <Button size="small" danger onClick={() => { remove(field.name); setDirty(true); }}>Delete</Button>
                      </Space>
                    ),
                  },
                ];

                return (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="key"
                      columns={columns}
                      dataSource={fields}
                      scroll={{ x: 850 }}
                    />
                    <Button type="dashed" block onClick={() => { add(blankIngredient()); setDirty(true); }}>
                      Add Ingredient
                    </Button>
                  </Space>
                );
              }}
            </Form.List>

            <Divider orientation="left">Instructions</Divider>

            <Form.List name="instructions">
              {(fields, { add, remove }) => (
                <Space
                  direction="vertical"
                  size={16}
                  style={{ width: "100%" }}
                >
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      title={`Step ${index + 1}`}
                      extra={
                        <Space wrap>
                          <Button
                            size="small"
                            disabled={index === 0}
                            onClick={() =>
                              moveListItem("instructions", index, index - 1)
                            }
                          >
                            Up
                          </Button>
                          <Button
                            size="small"
                            disabled={index === fields.length - 1}
                            onClick={() =>
                              moveListItem("instructions", index, index + 1)
                            }
                          >
                            Down
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => {
                              remove(field.name);
                              setDirty(true);
                            }}
                          >
                            Delete
                          </Button>
                        </Space>
                      }
                    >
                      <Form.Item
                        name={[field.name, "type"]}
                        initialValue="text"
                        hidden
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item
                        label="Instruction"
                        name={[field.name, "text"]}
                      >
                        <TextArea
                          autoSize={{ minRows: 2, maxRows: 8 }}
                          placeholder="Describe this recipe step"
                        />
                      </Form.Item>
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    block
                    onClick={() => {
                      add(blankInstruction());
                      setDirty(true);
                    }}
                  >
                    Add Step
                  </Button>
                </Space>
              )}
            </Form.List>

            <Divider />

            {actionButtons}
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default RecipeEditor;
