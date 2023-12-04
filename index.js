const express = require('express');
const multer = require('multer');
const { RekognitionClient, DetectCustomLabelsCommand } = require('@aws-sdk/client-rekognition');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3333;

// Configuração do multer para armazenar a imagem em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rota para servir o arquivo HTML
app.get('/', (_, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Rota para processar a imagem e retornar os retângulos
app.post('/catch-ladybugs', upload.single('arquivo'), async (req, res) => {
    try {
        // Configuração do cliente Rekognition
        const rekognitionClient = new RekognitionClient({
            region: 'us-east-2',
            credentials: {
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY
            }
        });

        // Configuração da requisição para detectar rótulos personalizados
        const input = {
            ProjectVersionArn: 'arn:aws:rekognition:us-east-2:933833139606:project/reconhecedor-joaninha/version/reconhecedor-joaninha.2023-12-03T06.38.59/1701596339492',
            Image: {
                Bytes: req.file.buffer,
            }
        };

        // Execução do comando para detectar rótulos personalizados
        const command = new DetectCustomLabelsCommand(input);
        const response = await rekognitionClient.send(command);

        // Função para tratar os dados dos retângulos
        const trataDados = (element) => ({
            name: element.Name,
            confidence: element.Confidence,
            geometry: element.Geometry.BoundingBox,
        });

        // Filtragem dos retângulos com confiança superior a 90%
        const retangulos = response.CustomLabels
            .filter(element => element.Confidence > 60)
            .map(trataDados);

        // Se nenhum retângulo tiver mais de 90% de confiança, pegar o primeiro retângulo
        if (retangulos.length === 0 && response.CustomLabels.length > 0) {
            retangulos.push(trataDados(response.CustomLabels[0]));
        }

        console.log(retangulos);
        res.json(retangulos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar a imagem.' });
    }
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
