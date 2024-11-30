const pool = require('./db');
const Base = require('./Base');
const imageItemModel = require('./ImageItem');
const brandModel = require('./Brand');
const commentModel = require('./Comment');
class Product extends Base {

    VIEW_NAME = 'view_product';
    TABLE_NAME = 'product';
    SELECT_ALL_QUERY = `SELECT * FROM ${this.VIEW_NAME}`;

    convertRowToObject = (row) => {
        const object = new Product(row);
        return object;
    }

    // array_conds: lấy sản phẩm dựa theo cột
    // array_sorts: sắp xếp tăng hay giảm
    // page: trang thứ mấy
    // qty_per_page: số lượng sản phẩm mỗi trang
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

    getImageItems = async () => {
        return await imageItemModel.getByProductId(this.id);
    }

    getBrand = async () => {
        return await brandModel.find(this.brand_id);
    }

    getComments = async () => {
        return await commentModel.getByProductId(this.id);
    }

    find = async (id) => {
        try {
            const [rows] = await pool.execute(`${this.SELECT_ALL_QUERY} WHERE view_product.id=?`, [id]);
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

    findByCategory = async (categoryId) => {
        try {
            const [rows] = await pool.execute(`${this.SELECT_ALL_QUERY} WHERE view_product.category_id=?`, [categoryId]);
            return rows;  // Return all rows directly, as an array of products
        } catch (error) {
            throw new Error(error);
        }
    };

    findByBrand = async (brandId) => {
        try {
            const [rows] = await pool.execute(`${this.SELECT_ALL_QUERY} WHERE view_product.brand_id=?`, [brandId]);
            return rows;  // Return all rows directly, as an array of products
        } catch (error) {
            throw new Error(error);
        }
    };

}
module.exports = new Product();
