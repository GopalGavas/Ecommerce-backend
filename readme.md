# 📦 **SwiftMart Backend**

## 📖 Overview

SwiftMart is a fully functional e-commerce backend built with **Node.js**, **Express**, and **MongoDB**. It offers secure user authentication, product management, shopping cart functionality, order processing, and more. This backend leverages modern tools like **JWT**, **Mongoose**, and **Cloudinary** to provide a seamless experience for admins and users alike.

### 🌐 **Quick Links**

| Resource              | Link                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| **API Documentation** | [API Documentation](https://documenter.getpostman.com/view/28528757/2sAY547evT) |

## ✨ Features

- 🔐 **User Authentication**: JWT-based authentication for secure login/signup and role-based authorization (Admins vs. Users).
- 🛍️ **Product Management**: CRUD functionality for managing products, including image uploads via Cloudinary.
- 📦 **Order Management**: Seamless checkout process and order history management.
- 🛒 **Shopping Cart**: Add/remove products to/from the cart and manage quantities.
- 🛡️ **Security**: Protection with middleware like `express-rate-limit`, `helmet`, and `cors`.
- ⭐ **Reviews & Ratings**: Users can leave ratings and reviews for products.
- 🔍 **Search and Filtering**: Full-text search and category-based filtering for easy product discovery.
- 💸 **Coupon Creation**: Admins can create and manage discount coupons for promotional purposes.
- 📨 **Inquiry Handling**: Users can submit inquiries; admins can respond directly within the platform.
- 📝 **Blog Creation**: Admins can create, update, and publish blogs to engage users and share updates.

## 🛠️ Tools & Technologies

- **Node.js**: Backend runtime environment.
- **Express.js**: Web framework for building RESTful APIs.
- **MongoDB**: NoSQL database for storing user, product, and order data.
- **JWT (JSON Web Tokens)**: Secure user authentication and role-based access control.
- **Mongoose**: ODM (Object Data Modeling) for MongoDB.
- **Cloudinary**: Image hosting and management service for product images.
- **Nodemailer**: For sending email notifications.
- **Bcrypt.js**: For hashing user passwords.
- **Multer**: Middleware for handling multipart form-data, used for image uploads.

## 🚀 Getting Started

### Prerequisites

Before running the project, make sure you have the following installed:

- **Node.js** (v14 or later)
- **MongoDB** (either locally or through a cloud service like MongoDB Atlas)
- **Cloudinary account** for image hosting

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/GopalGavas/Ecommerce-backend
   ```

2. **Navigate to the project directory**:

   ```bash
   cd Ecommerce-backend
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Environment Configuration**:

Create a .env file in the root directory and configure the following environment variables:

```bash
PORT=8080
MONGODB_URL=your_mongoDB_connection_string
CORS_ORIGIN=your_cors_origin
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=your_access_token_expiry
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=your_refresh_token_expiry
SMTP_MAIL=your_smtp_mail
SMTP_PASSWORD=your_smtp_password
```

5. **Run the app in development mode**:

```bash
npm run dev
```

6. **Start the app in production**:

```bash
npm start
```

## 📋 **API Endpoints**

| Endpoint              | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `/api/v1/users`       | User registration, login, profile management.         |
| `/api/v1/products`    | Browse, add, update, and delete products.             |
| `/api/v1/blogs`       | Access, create, edit, and delete blog posts.          |
| `/api/v1/likes`       | Like or unlike blog posts.                            |
| `/api/v1/categories`  | create product categories for filtering (Admin only). |
| `/api/v1/coupons`     | View and manage discount coupons (Admin only).        |
| `/api/v1/cart`        | Manage the user’s shopping cart items.                |
| `/api/v1/orders`      | Place orders, view order history, and manage orders.  |
| `/api/v1/enquiries`   | Submit inquiries and respond to user questions.       |
| `/api/v1/healthcheck` | Backend health verification                           |

## 🔐 Security

The application includes several security features to protect data and users:

- **JWT Authentication**: Secure login and role-based access control.
- **Helmet**: Sets HTTP headers to protect from common threats.
- **Rate Limiting**: Mitigates brute-force attacks with express-rate-limit.
- **Input Sanitization**: Prevents MongoDB injection attacks with express-mongo-sanitize.

## 🤝 Contribution

We welcome contributions to **SwiftMart**! If you'd like to contribute, please follow these steps:

1. **Fork** the repository.
2. Create a **new branch**:
   ```bash
   git checkout -b feature-name
   ```
3. **Make your changes** and commit them:
   ```bash
   git commit -am 'Add feature'
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature-name
   ```
5. **Create a new pull request** with a clear description of what changes you’ve made and why they are beneficial.

## 📜 License

This project is licensed under the ISC License.

## 👤 Author

**Gopal Gavas**
