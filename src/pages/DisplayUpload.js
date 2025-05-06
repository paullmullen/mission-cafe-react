import React, { useEffect, useState } from 'react';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/firebase';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
`;

const Grid = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Thumbnail = styled.img`
  width: 300px;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
`;

const ImageUploadPage = () => {
  const paths = [
    process.env.REACT_APP_IMAGE_4_PATH,
    process.env.REACT_APP_IMAGE_3_PATH,
    process.env.REACT_APP_IMAGE_2_PATH,
    process.env.REACT_APP_IMAGE_1_PATH,
  ];

  const [imageURLs, setImageURLs] = useState([null, null, null, null]);

  useEffect(() => {
    const fetchImages = async () => {
      const urls = await Promise.all(
        paths.map(async (path) => {
          try {
            const storageRef = ref(storage, path);
            return await getDownloadURL(storageRef);
          } catch (e) {
            console.warn(`Failed to fetch ${path}:`, e);
            return null;
          }
        })
      );
      setImageURLs(urls);
    };

    fetchImages();
  }, [paths]);

  const handleUpload = async (index, file) => {
    if (!file) return;

    const path = paths[index];
    const storageRef = ref(storage, path);

    try {
      await uploadBytes(storageRef, file); // Overwrite
      const newURL = await getDownloadURL(storageRef);
      setImageURLs((prev) => {
        const updated = [...prev];
        updated[index] = newURL;
        return updated;
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <Container>
      <Grid>
        {imageURLs.map((url, index) => (
          <Card key={index}>
            {url ? (
              <Thumbnail src={url} alt={`Image ${index + 1}`} />
            ) : (
              <p>No image</p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(index, e.target.files[0])}
            />
          </Card>
        ))}
      </Grid>
    </Container>
  );
};

export default ImageUploadPage;
