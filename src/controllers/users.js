import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { createUser, authenticateUser, getAllUsers, getUserById } from '../models/users.js';

const emailValidation = () => body('email').isString().bail().trim()
  .isLength({ max: 255 }).isEmail().withMessage('Enter a valid email address.').toLowerCase();
const passwordValidation = () => body('password').isString().bail()
  .isLength({ min: 7 }).withMessage('Password must contain at least 7 characters.')
  .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes.');
export const registrationValidation = [
  body('name').isString().bail().trim().isLength({ min: 1, max: 150 })
    .withMessage('Name must contain between 1 and 150 characters.')
    .custom(value => !value.includes('\0')).withMessage('Name contains an invalid character.'),
  emailValidation(), passwordValidation(),
];
export const loginValidation = [emailValidation(), passwordValidation()];
const renderForm = (res, view, body = {}, error = '', status = 200) => res.status(status).render(view, {
  title: view === 'register' ? 'Register' : 'Login',
  name: typeof body.name === 'string' ? body.name : '',
  email: typeof body.email === 'string' ? body.email : '', error,
});
export const showUserRegistrationForm = (req, res) => renderForm(res, 'register');
export const showLoginForm = (req, res) => renderForm(res, 'login');
export const processUserRegistrationForm = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return renderForm(res, 'register', req.body, errors.array()[0].msg, 400);
  try {
    await createUser(req.body.name, req.body.email, await bcrypt.hash(req.body.password, 10));
    req.flash('success', 'Registration successful. Please log in.');
    res.redirect(303, '/login');
  } catch (error) {
    if (error.code === '23505') return renderForm(res, 'register', req.body, 'An account with this email already exists.', 400);
    next(error);
  }
};
export const processLoginForm = async (req, res, next) => {
  if (!validationResult(req).isEmpty()) return renderForm(res, 'login', req.body, 'Invalid email or password.', 400);
  try {
    const user = await authenticateUser(req.body.email, req.body.password);
    if (!user) return renderForm(res, 'login', req.body, 'Invalid email or password.', 401);
    // Rotate the session ID on login and persist before redirecting.
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.user = user;
      req.flash('success', 'Login successful.');
      req.session.save(error => error ? next(error) : res.redirect(303, '/dashboard'));
    });
  } catch (error) { next(error); }
};
export const processLogout = (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('cse340.sid', { path: '/' });
    res.redirect(303, '/login');
  });
};
// Reload roles so database permission changes apply to existing sessions.
export const loadCurrentUser = async (req, res, next) => {
  res.locals.user = null;
  res.locals.isLoggedIn = false;
  res.locals.isAdmin = false;
  try {
    if (req.session.user) {
      const user = await getUserById(req.session.user.user_id);
      if (user) req.session.user = user;
      else delete req.session.user;
      res.locals.user = user;
      res.locals.isLoggedIn = Boolean(user);
      res.locals.isAdmin = user?.role_name === 'admin';
    }
    res.locals.successMessages = req.flash('success');
    res.locals.errorMessages = req.flash('error');
    next();
  } catch (error) { next(error); }
};
export const requireLogin = (req, res, next) => {
  if (req.session.user) return next();
  req.flash('error', 'You must be logged in to access that page.');
  res.redirect(303, '/login');
};
export const requireRole = role => (req, res, next) => {
  if (!req.session.user) return requireLogin(req, res, next);
  if (req.session.user.role_name === role) return next();
  req.flash('error', 'You do not have permission to access that page.');
  res.redirect(303, '/dashboard');
};
export const showDashboard = (req, res) => res.render('dashboard', {
  title: 'Dashboard', name: req.session.user.name, email: req.session.user.email,
});
export const showUsersPage = async (req, res, next) => {
  try { res.render('users', { title: 'Registered Users', users: await getAllUsers() }); }
  catch (error) { next(error); }
};
