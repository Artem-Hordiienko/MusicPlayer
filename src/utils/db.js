// src/utils/db.js

// Отримати список користувачів
export function getUsers() {
  const users = localStorage.getItem("users");
  return users ? JSON.parse(users) : [];
}

// Додати нового користувача
export function addUser({ name, email, password }) {
  const users = getUsers();

  // перевірка на унікальність email
  if (users.find(u => u.email === email)) {
    throw new Error("Користувач з таким email вже існує");
  }

  const newUser = {
    id: Date.now(), // унікальний ID
    name,
    email,
    password,
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));
  return newUser;
}

// Знайти користувача (для логіну)
export function findUser(email, password) {
  const users = getUsers();
  return users.find(u => u.email === email && u.password === password);
}

// Отримати поточного користувача
export function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

// Установити поточного користувача (після логіну)
export function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

// Вийти (очистити поточного користувача)
export function logout() {
  localStorage.removeItem("currentUser");
}
