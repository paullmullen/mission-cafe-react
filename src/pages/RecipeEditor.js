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

            {dirty && (
              <Alert
                type="warning"
                showIcon
                message="Unsaved changes"
                style={{ padding: "6px 12px" }}
              />
            )}
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

            <Form.Item label="Image URL" name="image">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => {
                const imageUrl = form.getFieldValue("image");

                return imageUrl ? (
                  <div style={{ marginBottom: 24 }}>
                    <Image
                      src={imageUrl}
                      alt="Recipe preview"
                      width={220}
                      style={{
                        maxHeight: 260,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='140'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3EImage unavailable%3C/text%3E%3C/svg%3E"
                    />
                  </div>
                ) : null;
              }}
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
                      title={`Ingredient ${index + 1}`}
                      extra={
                        <Space wrap>
                          <Button
                            size="small"
                            disabled={index === 0}
                            onClick={() =>
                              moveListItem("ingredients", index, index - 1)
                            }
                          >
                            Up
                          </Button>
                          <Button
                            size="small"
                            disabled={index === fields.length - 1}
                            onClick={() =>
                              moveListItem("ingredients", index, index + 1)
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
                        label="Ingredient Name"
                        name={[field.name, "ingredientName"]}
                      >
                        <Input placeholder="Ice" />
                      </Form.Item>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Sizes"
                            name={[field.name, "ingredientSizes"]}
                          >
                            <Input placeholder="Small, Medium, Large or All Sizes" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Amounts"
                            name={[field.name, "ingredientAmounts"]}
                          >
                            <Input placeholder="1 tsp, 2 tsp, 3 tsp or Fill to top of cup" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    block
                    onClick={() => {
                      add(blankIngredient());
                      setDirty(true);
                    }}
                  >
                    Add Ingredient
                  </Button>
                </Space>
              )}
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

            <Space wrap>
              <Button
                type="primary"
                size="large"
                loading={saving}
                onClick={saveRecipe}
              >
                {selectedId ? "Save Recipe" : "Create Recipe"}
              </Button>

              <Button
                size="large"
                disabled={!form.getFieldValue("name")}
                onClick={duplicateRecipe}
              >
                Duplicate
              </Button>

              <Button
                danger
                size="large"
                disabled={!selectedId}
                onClick={removeRecipe}
              >
                Delete Recipe
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default RecipeEditor;
