const customerModel = require('../models/Customer');
const orderModel = require('../models/Order');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const provinceModel = require('../models/Province');
const districtModel = require('../models/District');
const wardModel = require('../models/Ward');
class CustomerController {

    // thông tin tài khoản
    static show = async (req, res) => {
        // trycatch
        try {
            const customer = await customerModel.findEmail(req.session.email);
            res.render('customer/show', {
                customer: customer
            });

        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }

    }

    // địa chỉ giao hàng mặc định
    static shippingDefault = async (req, res) => {
        // trycatch
        try {
            // support 2 trường hợp, đã login và chưa login
            const email = req.session.email;
            const customer = await customerModel.findEmail(email);
            const provinces = await provinceModel.all();
            const selected_ward_id = customer.ward_id;
            // Cần danh sách quận huyện và phường xã, danh tỉnh thành đã có ở trên
            let districts = [];
            let wards = [];
            let selected_district_id = '';
            let selected_province_id = '';
            if (selected_ward_id) {
                const selected_ward = await wardModel.find(selected_ward_id);
                selected_district_id = selected_ward.district_id;
                wards = await wardModel.getByDistrictId(selected_district_id);

                const selected_district = await districtModel.find(selected_district_id);
                selected_province_id = selected_district.province_id;
                districts = await districtModel.getByProvinceId(selected_province_id);
            }
            res.render('customer/shippingDefault', {
                customer: customer,
                provinces: provinces,
                districts: districts,
                wards: wards,
                selected_ward_id: selected_ward_id,
                selected_district_id: selected_district_id,
                selected_province_id: selected_province_id
            });
        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    // đơn hàng của tôi
    static orders = async (req, res) => {
        // trycatch
        try {
            const email = req.session.email;
            const customer = await customerModel.findEmail(email);
            const customer_id = customer.id;
            const orders = await orderModel.getByCustomerId(customer_id);
            for (let i = 0; i <= orders.length - 1; i++) {
                //tự thêm orderItems
                orders[i].orderItems = await orders[i].getOrderItems();
                for (let j = 0; j <= orders[i].orderItems.length - 1; j++) {
                    orders[i].orderItems[j].product = await orders[i].orderItems[j].getProduct();
                }
                orders[i].status = await orders[i].getStatus();
            }
            res.render('customer/orders', {
                orders: orders
            });
        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    // chi tiết đơn hàng
    static orderDetail = async (req, res) => {
        // trycatch
        try {
            const id = req.params.id;
            const order = await orderModel.find(id);
            order.orderItems = await order.getOrderItems();
            for (let i = 0; i <= order.orderItems.length - 1; i++) {
                order.orderItems[i].product = await order.orderItems[i].getProduct();
            }
            order.total_price = await order.getSubTotalPrice();
            const shippingWard = await order.getShippingWard();
            const shippingDistrict = await shippingWard.getDistrict();
            const shippingProvince = await shippingDistrict.getProvince();
            res.render('customer/orderDetail', {
                order: order,
                shippingWard: shippingWard,
                shippingDistrict: shippingDistrict,
                shippingProvince: shippingProvince,
            });
        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    // cập nhật thông tin tài khoản
    static updateInfo = async (req, res) => {
        // trycatch
        try {
            const customer = await customerModel.findEmail(req.session.email);
            // cập nhật name và mobile
            customer.name = req.body.fullname;
            customer.mobile = req.body.mobile;
            if (req.body.current_password && req.body.password) {
                //kiểm tra mật khẩu hiện tại trong database đúng không?
                if (!bcrypt.compareSync(req.body.current_password, customer.password)) {
                    req.session.message_error = 'Lỗi: Sai mật khẩu';
                    req.session.save(() => {
                        res.redirect('/thong-tin-tai-khoan.html');
                    });
                    return;
                }
                //kiểm tra mật khẩu hiện tại thành công
                // mã hóa mật khẩu mới
                // độ khó của mật khẩu
                const saltRounds = 10;
                const salt = bcrypt.genSaltSync(saltRounds);
                const new_password_hash = bcrypt.hashSync(req.body.password, salt);
                customer.password = new_password_hash;
            }
            await customer.update();
            req.session.message_success = 'Đã cập nhật thông tin tài khoản thành công';
            // lưu session xuống file và điều hướng đến trang thông tin tài khoản
            // phải cập nhật session.name
            req.session.name = req.body.fullname;
            req.session.save(() => {
                res.redirect('/thong-tin-tai-khoan.html');
            })

        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }

    }

    static updateShippingDefault = async (req, res) => {
        // lấy customer từ database
        const email = req.session.email;
        const customer = await customerModel.findEmail(email);

        // update thông tin customer
        customer.shipping_name = req.body.fullname;
        customer.shipping_mobile = req.body.mobile;
        customer.housenumber_street = req.body.address;
        customer.ward_id = req.body.ward;

        // lưu customer lại database
        await customer.update();

        // message
        req.session.message_success = 'Đã cập nhật địa chỉ giao hàng mặc định thành công';
        req.session.save(() => res.redirect('/dia-chi-giao-hang-mac-dinh.html'));
    }

    // trả về true nếu không tồn tại email
    // trả về false nếu tồn tại email
    static notexisting = async (req, res) => {
        try {
            const email = req.query.email;
            const customer = await customerModel.findEmail(email);
            if (customer) {
                res.end('false');
                return;
            }
            res.end('true');
        }
        catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    // đăng ký tạo tài khoản mới
    static register = async (req, res) => {
        try {
            console.log(req.body);
            console.log(req.recaptcha);
            if (req.recaptcha.error) {
                req.session.message_error = `Lỗi: ${req.recaptcha.error}`;
                req.session.save(() => {
                    res.redirect('/');
                });
                return;
            }

            // kiểm tra email có tồn tại trong hệ thống không
            const email = req.body.email;
            const customer = await customerModel.findEmail(email);
            if (customer) {
                req.session.message_error = `Lỗi: ${email} đã tồn tại trong hệ thống`;
                req.session.save(() => {
                    res.redirect('/');
                });
                return;
            }

            const saltRounds = 10;
            const salt = bcrypt.genSaltSync(saltRounds);
            const encode_password = bcrypt.hashSync(req.body.password, salt);

            const data = {
                name: req.body.fullname,
                email: req.body.email,
                password: encode_password,
                mobile: req.body.mobile,
                shipping_name: req.body.fullname,
                shipping_mobile: req.body.mobile,
                login_by: 'form',
                is_active: 0,
            }
            await customerModel.save(data);

            const to = email;
            const subject = 'Godashop - Verify your email.'
            const web = `${req.protocol}://${req.headers.host}`;
            const privateKey = process.env.JWT_KEY;
            const token = jwt.sign({ email: to }, privateKey, { algorithm: 'HS256' });
            const linkActiveAccount = `${web}/customer/active/token/${token}`;
            const content = `
            Xin chào ${email}, <br>
            Xin vui lòng click vào link bên dưới để kích hoạt tài khoản, <br>
            <a href = "${linkActiveAccount}"> Active Account</a><br>
            Được gởi từ web ${web}.
            `;
            console.log('Sending email to:', to);

            await req.app.locals.helpers.sendEmail(to, subject, content);
            req.session.message_success = `Đã tạo tài khoản thành công, vui lòng vào ${email} để kích hoạt tài khoản.`;
            req.session.save(() => {
                res.redirect('/');
            })
        } catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    // kích hoạt tài khoản
    // kích hoạt tài khoản
    static active = async (req, res) => {
        try {
            const token = req.params.token;
            const privateKey = process.env.JWT_KEY;
            const decoded = jwt.verify(token, privateKey);
            const email = decoded.email;
            const customer = await customerModel.findEmail(email);
            customer.is_active = 1;
            await customer.update();
            req.session.message_success = `Đã kích hoạt tài khoản thành công`;
            req.session.save(() => {
                res.redirect('/');
            });
        }
        catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    static forgotpassword = async (req, res) => {
        try {
            const email = req.body.email;
            const to = email;
            const subject = 'Godashop - Reset password'
            const web = `${req.protocol}://${req.headers.host}`;
            const privateKey = process.env.JWT_KEY;
            const token = jwt.sign({ email: to }, privateKey, { algorithm: 'HS256' });
            const linkActiveAccount = `${web}/customer/resetpassword/token/${token}`;
            const content = `
            Xin chào ${email}, <br>
            Xin vui lòng click vào link bên dưới để tạo mới mật khẩu, <br>
            <a href = "${linkActiveAccount}">Reset Password</a><br>
            Được gởi từ web ${web}.
            `;
            req.app.locals.helpers.sendEmail(to, subject, content);
            console.log('ddd');
            req.session.message_success = `Vui lòng kiểm tra ${email} để tạo mới mật khẩu.`;
            req.session.save(() => {
                res.redirect('/');
            });
        }
        catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    static resetpassword = async (req, res) => {
        try {
            const token = req.params.token;
            const privateKey = process.env.JWT_KEY;
            const decoded = jwt.verify(token, privateKey);
            const email = decoded.email;
            res.render('customer/forgotpassword', {
                email: email,
                token: token,
            })
        }
        catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }

    static updatePassword = async (req, res) => {
        try {
            const token = req.body.token;
            const privateKey = process.env.JWT_KEY;
            const decoded = jwt.verify(token, privateKey);
            const email = decoded.email;
            const customer = await customerModel.findEmail(email);

            const saltRounds = 10;
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(req.body.password, salt);
            customer.password = hash;

            await customer.update();
            req.session.message_success = `Đã tạo mới mật khẩu thành công.`;
            req.session.save(() => {
                res.redirect('/');
            });
        }
        catch (error) {
            // 500 là lỗi internal server (lỗi xãy ra ở server)
            console.log(error);//dành cho dev xem
            res.status(500).send(error.message);//cho người dùng xem
        }
    }
}

module.exports = CustomerController;