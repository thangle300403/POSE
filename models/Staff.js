const pool = require('./db');
const Base = require('./Base');
const roleModel = require('./Role');
class Staff extends Base {
    TABLE_NAME = 'staff';
    SELECT_ALL_QUERY = `SELECT * FROM ${this.TABLE_NAME}`;

    convertRowToObject = (row) => {
        const object = new Staff(row);
        return object;
    }

    getBy = async (array_conds = [], array_sorts = [], page = null, qty_per_page = null) => {
        let page_index;
        if (page) {
            page_index = page - 1;
        }
        let temp = [];
        for (let column in array_conds) {
            let cond = array_conds[column];
            let type = cond.type;
            let val = cond.val;
            let str = `${column} ${type} `;
            if (["BETWEEN", "LIKE"].includes(type)) {
                str += val; //name LIKE '%abc%'
            } else {
                str += `'${val}'`;
            }
            temp.push(str);
        }
        let condition = null;
        if (Object.keys(array_conds).length) {
            condition = temp.join(" AND ");
        }
        temp = [];
        for (let key in array_sorts) {
            let sort = array_sorts[key];
            temp.push(`${key} ${sort}`);
        }
        let sort = null;
        if (Object.keys(array_sorts).length) {
            sort = `ORDER BY ${temp.join(" , ")}`;
        }
        let limit = null;
        if (qty_per_page) {
            let start = page_index * qty_per_page;
            limit = `LIMIT ${start}, ${qty_per_page}`;
        }

        return await this.fetch(condition, sort, limit);
    }

    // Tìm 1 dòng student 
    findEmail = async (email) => {
        try {
            const [rows] = await pool.execute(`${this.SELECT_ALL_QUERY} WHERE ${this.TABLE_NAME}.email=?`, [email]);
            // check nếu không có dòng nào thỏa mãn trong bảng student
            if (rows.length === 0) {
                return null;
            }
            const row = rows[0];
            // gọi hàm tạo đối tượng
            const object = this.convertRowToObject(row);
            return object;
        }
        catch (error) {
            throw new Error(error);
        }

    }
    getRole = async () => {
        const role = await roleModel.find(this.role_id);
        return role;
    }
    findByRole = async (roleId) => {
        try {
            const [rows] = await pool.execute(`${this.SELECT_ALL_QUERY} WHERE ${this.TABLE_NAME}.role_id=?`, [roleId]);
            return rows;  // Return all rows directly, as an array of products
        } catch (error) {
            throw new Error(error);
        }
    };
}
module.exports = new Staff();