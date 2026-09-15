# 📍 GeoLOC

> Ferramenta web ágil e moderna para conversão, captura e formatação de coordenadas geográficas no padrão brasileiro (vírgula decimal), com foco em dispositivos móveis e integração cartográfica.

![](img/interface.jpg)

## 🚀 Sobre o Projeto

O **GeoLOC** foi desenvolvido para simplificar o trabalho de pilotos de drones, topógrafos, engenheiros e usuários de sistemas como o **SARPAS (DECEA)**, Google Earth e ferramentas GIS.

Frequentemente, coordenadas copiadas de mapas (como Google Maps ou GPS) vêm no formato internacional com ponto decimal e juntas em uma única linha:
`-20.464431484462686, -45.951409846570364`

Esta ferramenta separa automaticamente os valores em campos individuais de **Latitude** e **Longitude** e converte o ponto decimal (`.`) para a vírgula (`,'`), pronta para colagem em formulários técnicos brasileiros.

---

🔗 **Acesse online:** **[https://sandrobenigno.github.io/GeoLOC_Tool/](https://sandrobenigno.github.io/GeoLOC_Tool/)**

---

## ✨ Funcionalidades Principais

- 📲 **Aplicativo Instalável (PWA)**: Pode ser instalado na tela inicial do celular Android, iOS ou desktop como um app nativo, funcionando 100% offline via Service Worker.
- 🗺️ **Mapa Interativo (OpenStreetMap)**: Toque ou clique em qualquer local do mapa para obter e converter as coordenadas instantaneamente, sem necessidade de chaves de API pagas.
- 🛰️ **Gerador de Mapas Vetoriais FlatGeobuf (.fgb)**:
  - Recorte dinâmico do OpenStreetMap a partir da visão da tela ou retângulo desenhado pelo usuário.
  - Baixa e renderiza offline **rodovias, estradas rurais, ruas e rios/hidrografia**.
  - Formato binário ultra-rápido com índice espacial FlatGeobuf e exportação de arquivo `.fgb`.
- 🏛️ **Malhas Territoriais Oficiais (IBGE)**:
  - Base vetorial leve do Brasil pré-instalada (~30 KB).
  - Download sob demanda de estados completos ou **municípios individuais em qualidade máxima**.
- 📂 **Importação & Armazenamento Local (IndexedDB)**:
  - Suporte para carregar seus próprios arquivos `.fgb`, `.geojson` ou `.json`.
  - Armazenamento persistente e sem limites no banco de dados local do navegador.
- 🛡️ **Zonas de Restrição DECEA (GeoAISWEB)**: Camada oficial WMS com visualização de Áreas Proibidas (P), Restritas (R), Perigosas (D), Zonas de Aeródromo (ATZ), CTR/TMA, traçado de pistas de pouso, cones de cabeceiras e helipontos.
- ⚙️ **Painel de Configurações em Abas**: Menu organizado para gerenciar espaço aéreo e mapas offline.
- 🎯 **Geolocalização ("Onde estou?")**: Localize sua posição GPS atual com um toque e preencha os campos automaticamente.
- 🌗 **Modo Claro / Modo Escuro**: Alternância dinâmica de temas (Sol/Lua) com ajuste de contraste do mapa em tempo real via filtros CSS.
- 📋 **Atalhos Rápidos de Cópia**: Botões dedicados para copiar Latitude, Longitude ou ambos com feedback visual instantâneo ("Copiado!").
- 🧠 **Parser Inteligente**: Aceita coordenadas coladas com vírgulas, espaços, ponto-e-vírgula, colchetes ou parênteses.
- 💾 **Preferências Salvas**: Lembra do seu tema preferido, camadas ativas e mapas baixados via `localStorage` e `IndexedDB`.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5** semântico & **PWA Manifest**
- **Service Worker** & **Cache API** (Offline-First)
- **FlatGeobuf (FGB)** & **Overpass API (OpenStreetMap)**
- **IndexedDB API** (Armazenamento de binários FlatGeobuf e GeoJSON)
- **CSS3** moderno (CSS Variables, Flexbox, Glassmorphism, Micro-animações)
- **JavaScript (ES6+)** vanilla (sem frameworks pesados ou dependências externas)
- **Leaflet.js** (v1.9.4) & **OpenStreetMap**
- **API Malhas Geográficas IBGE** & **GeoAISWEB DECEA WMS**

---

## 📂 Estrutura do Projeto

```text
GeoLOC/
│
├── index.html          # Estrutura da interface web e modais
├── style.css           # Estilização visual, temas (Dark/Light) e responsividade
├── app.js              # Lógica de conversão, mapa, IndexedDB e PWA
├── manifest.json       # Manifesto PWA para instalação no Android/Desktop
├── sw.js               # Service Worker para funcionamento offline
├── data/
│   └── brazil_base.json # Malha vetorial simplificada dos estados brasileiros
├── icons/              # Ícones PWA em múltiplas resoluções (192x192, 512x512)
└── README.md           # Documentação do projeto
```

---

## 📱 Como Instalar no Celular (PWA)

1. Abra o link [https://sandrobenigno.github.io/GeoLOC_Tool/](https://sandrobenigno.github.io/GeoLOC_Tool/) no **Chrome** ou **Safari** do celular.
2. Toque no menu do navegador (três pontinhos ou botão de compartilhar).
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. Pronto! O GeoLOC agora abre em tela cheia como um app nativo, mesmo sem internet.

---

## 💻 Como Executar Localmente

Como o projeto é 100% estático (HTML/CSS/JS puros), basta rodar através de um servidor local:

```bash
# Com Python 3
python -m http.server 8000

# Ou com Node.js / npx
npx serve .
```

Acesse em: `http://localhost:8000`

---

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](https://opensource.org/licenses/MIT).

