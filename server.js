const mysql = require('mysql2');
const inquirer = require('inquirer');
require('dotenv').config();

const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER, //use your MySQL username
    password: process.env.DB_PASS, //use your MySQL password
    database: 'employees_db'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the employee_db database.');
    startApp();
});

function startApp() {
    inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
            'View all departments',
            'View all roles',
            'View all employees',
            'Add a department',
            'Add a role',
            'Add an employee',
            'Update an employee role',
            'Exit'
        ]
    })
    .then(answer => {
        switch (answer.action) {
            case 'View all departments':
                viewDepartments();
                break;
            case 'View all roles':
                viewRoles();
                break;
            case 'View all employees':
                viewEmployees();
                break;
            case 'Add a department':
                addDepartment();
                break;
            case 'Add a role':
                addRole();
                break;
            case 'Add an employee':
                addEmployee();
                break;
            case 'Update an employee role':
                updateEmployeeRole();
                break;
            case 'Exit':
                db.end();
                break;
        }
    });
}

function viewEmployees() {
    const query = `
        SELECT employees.id, employees.first_name, employees.last_name, roles.title, departments.name AS department, roles.salary, 
               CONCAT(manager.first_name, ' ', manager.last_name) AS manager
        FROM employees
        LEFT JOIN roles ON employees.role_id = roles.id
        LEFT JOIN departments ON roles.department_id = departments.id
        LEFT JOIN employees AS manager ON employees.manager_id = manager.id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error retrieving employees:', err);
            return;
        }
        console.table(results);
        startApp();
    });
}

function viewRoles() {
    const query = `
        SELECT roles.id, roles.title, roles.salary, departments.name AS department 
        FROM roles
        JOIN departments ON roles.department_id = departments.id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error retrieving roles:', err);
            return;
        }
        console.table(results);
        startApp();
    });
}

function viewDepartments() {
    const query = `SELECT * FROM departments;`;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error retrieving departments:', err);
            return;
        }
        console.table(results);
        startApp();
    });
}

function addDepartment() {
    inquirer
        .prompt([
            {
                type: 'input',
                name: 'departmentName',
                message: 'Enter the name of the new department:',
                validate: input => input ? true : 'Department name cannot be empty!'
            }
        ])
        .then(answer => {
            db.query(`INSERT INTO departments (name) VALUES (?)`, [answer.departmentName], (err, result) => {
                if (err) {
                    console.error('Error adding department:', err);
                    return;
                }
                console.log(`Department "${answer.departmentName}" added successfully!`);
                startApp();
            });
        });
}

function addRole() {
    db.query('SELECT * FROM departments', (err, departments) => {
        if (err) {
            console.error('Error fetching departments:', err);
            return;
        }

        inquirer
            .prompt([
                {
                    type: 'input',
                    name: 'roleTitle',
                    message: 'Enter the name of the new role:',
                    validate: input => input ? true : 'Role title cannot be empty!'
                },
                {
                    type: 'input',
                    name: 'roleSalary',
                    message: 'Enter the salary for this role:',
                    validate: input => !isNaN(input) ? true : 'Salary must be a number!'
                },
                {
                    type: 'list',
                    name: 'departmentId',
                    message: 'Select the department for this role:',
                    choices: departments.map(dept => ({ name: dept.name, value: dept.id }))
                }
            ])
            .then(answer => {
                db.query(`INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)`, 
                [answer.roleTitle, answer.roleSalary, answer.departmentId], 
                (err, result) => {
                    if (err) {
                        console.error('Error adding role:', err);
                        return;
                    }
                    console.log(`Role "${answer.roleTitle}" added successfully!`);
                    startApp();
                });
            });
    });
}

function addEmployee() {
    db.query('SELECT * FROM roles', (err, roles) => {
        if (err) {
            console.error('Error fetching roles:', err);
            return;
        }

        db.query('SELECT * FROM employees', (err, employees) => {
            if (err) {
                console.error('Error fetching employees:', err);
                return;
            }

            inquirer
                .prompt([
                    {
                        type: 'input',
                        name: 'firstName',
                        message: 'Enter the employee\'s first name:',
                        validate: input => input ? true : 'First name cannot be empty!'
                    },
                    {
                        type: 'input',
                        name: 'lastName',
                        message: 'Enter the employee\'s last name:',
                        validate: input => input ? true : 'Last name cannot be empty!'
                    },
                    {
                        type: 'list',
                        name: 'roleId',
                        message: 'Select the employee\'s role:',
                        choices: roles.map(role => ({ name: role.title, value: role.id }))
                    },
                    {
                        type: 'list',
                        name: 'managerId',
                        message: 'Select the employee\'s manager (if applicable):',
                        choices: [{ name: 'None', value: null }].concat(
                            employees.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id }))
                        )
                    }
                ])
                .then(answer => {
                    db.query(`INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)`, 
                    [answer.firstName, answer.lastName, answer.roleId, answer.managerId], 
                    (err, result) => {
                        if (err) {
                            console.error('Error adding employee:', err);
                            return;
                        }
                        console.log(`Employee "${answer.firstName} ${answer.lastName}" added successfully!`);
                        startApp();
                    });
                });
        });
    });
}

function updateEmployeeRole() {
    db.query('SELECT * FROM employees', (err, employees) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return;
        }

        db.query('SELECT * FROM roles', (err, roles) => {
            if (err) {
                console.error('Error fetching roles:', err);
                return;
            }

            inquirer
                .prompt([
                    {
                        type: 'list',
                        name: 'employeeId',
                        message: 'Select an employee to update:',
                        choices: employees.map(emp => ({
                            name: `${emp.first_name} ${emp.last_name}`,
                            value: emp.id
                        }))
                    },
                    {
                        type: 'list',
                        name: 'roleId',
                        message: 'Select the new role for the employee:',
                        choices: roles.map(role => ({
                            name: role.title,
                            value: role.id
                        }))
                    }
                ])
                .then(answer => {
                    db.query(
                        `UPDATE employees SET role_id = ? WHERE id = ?`,
                        [answer.roleId, answer.employeeId],
                        (err, result) => {
                            if (err) {
                                console.error('Error updating employee role:', err);
                                return;
                            }
                            console.log(`Employee role updated successfully!`);
                            startApp();
                        }
                    );
                });
        });
    });
}


