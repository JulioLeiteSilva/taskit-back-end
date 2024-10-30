# TaskIT Backend - Guia de Configuração e Execução

Este guia irá ajudá-lo a configurar e executar o ambiente de desenvolvimento do backend do TaskIT utilizando Firebase Functions e emuladores locais. Certifique-se de seguir todas as instruções para garantir que o ambiente esteja configurado corretamente.

## 1. Dependências Necessárias

Antes de começar, instale as seguintes ferramentas:

### Node.js e npm

- **Node.js**: [Instalação do Node.js](https://nodejs.org/) (recomenda-se a versão LTS).
- **npm**: Instalado automaticamente com o Node.js.

### Firebase CLI

- Instale o Firebase CLI globalmente:
  ```bash
  npm install -g firebase-tools
  ```

Verifique se todas as dependências foram instaladas corretamente:

```bash
node -v
npm -v
firebase --version
```

## 2. Clonar o Repositório

Clone este repositório para sua máquina local:

```bash
git clone https://github.com/seu-usuario/taskit-backend.git
cd taskit-backend
```

## 3. Instalar Dependências do Projeto

Navegue até a pasta `functions` e instale as dependências:

```bash
cd functions
npm install
```

## 4. Compilar TypeScript

Este projeto usa TypeScript para o backend, então precisamos compilar o código antes de executá-lo. Na pasta `functions`, execute:

```bash
npm run build
```

Isso gerará uma pasta `lib` com o código JavaScript compilado.

## 5. Rodar os Emuladores Firebase

Para testar as funções e o banco de dados localmente, usamos o Firebase Emulator Suite. Na raiz do projeto (`taskit-backend`), execute:

```bash
firebase emulators:start
```

Isso iniciará os emuladores locais para Firestore, Authentication e Functions, permitindo que você teste tudo no ambiente local sem custos.

- Acesse o **Painel do Emulator** em `http://localhost:4000` para visualizar e gerenciar dados.

## 6. Testando Funções HTTP no Postman

Para testar as Firebase Functions usando o Postman:

1. Abra o Postman e crie uma nova requisição.
2. Defina o método HTTP (como `GET`, `POST`, etc.), dependendo da função que você está testando.
3. Cole a URL local da função no formato:

   ```
   http://localhost:5001/YOUR_PROJECT_ID/us-central1/FUNCTION_NAME
   ```

   - Substitua `YOUR_PROJECT_ID` pelo ID do projeto Firebase.
   - Substitua `FUNCTION_NAME` pelo nome da função que deseja testar.

4. Caso a função espere um **corpo JSON** (ex.: dados de cadastro), selecione `Body` -> `raw` e `JSON` no Postman e insira o conteúdo, por exemplo:

   ```json
   {
     "name": "John",
     "email": "john@example.com"
   }
   ```

5. Clique em **Send** para enviar a requisição e observe a resposta.

---

### Observação

Essas instruções funcionam tanto para usuários de **Ubuntu** quanto de **Windows**. Em caso de problemas específicos de sistema operacional, consulte a documentação do [Firebase CLI](https://firebase.google.com/docs/cli) ou do [Node.js](https://nodejs.org/).

Este guia oferece uma visão geral simples e direta para iniciar o desenvolvimento e testes no ambiente local.
