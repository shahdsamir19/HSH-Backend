FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

RUN npm install nodemailer

# Copy rest of the app
COPY . .

# Fix permissions (VERY IMPORTANT)
RUN chmod -R 755 /app

EXPOSE 5001

CMD ["npm", "start"]        