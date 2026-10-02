# cse340-course-repo
## Week 5: Authentication and Authorization

Registration and login use bcrypt password hashes and PostgreSQL-backed sessions.
The dashboard requires login; the users list and all create/edit/category-assignment
routes require the admin role. Public visitors can still browse service projects.

### Setup and Render deployment

1. Install dependencies with `npm ci`.
2. Set `DATABASE_URL` to the existing PostgreSQL database connection string.
3. Set `SESSION_SECRET` to a long random value (for example, generate one with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. Run `npm run migrate:auth` once against that database. This adds tables and
   preserves all existing organizations, projects, and categories. **Do not run
   `src/setup.sql` against the existing database: it resets the Week 4 data.**
5. On Render, use build command `npm ci`, start command `npm start`, and set
   `NODE_ENV=production`, `DATABASE_URL`, and `SESSION_SECRET`.
6. Deploy the updated branch, then register the grader account through `/register`:
   name `admin`, email `admin@example.com`, password `cse340!`.
7. In the database SQL editor, promote that registered account:

   ```sql
   UPDATE users
   SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin')
   WHERE lower(email) = 'admin@example.com';
   ```

8. Log in with that account. Verify the dashboard users link and `/users` list.
   Register a regular user; verify the link is absent and `/users` redirects to
   `/dashboard` with a permission message. Log out and verify protected pages
   redirect to `/login`.
9. Submit the GitHub repository URL and the actual Render site URL in Canvas.

Run `npm run test:auth` for isolated HTTP/SQL tests. They use an in-memory database
and do not modify your hosted database. These tests do not replace verifying the
live Render deployment and PostgreSQL migration.
