const express = require("express");
const body_parser = require("body-parser");
const bcrypt = require('bcrypt');
const saltRounds = 10;

const jwt = require("jsonwebtoken");
const jwt_key = "emp1234";
const jwtExpiryTime = 30000;

const { Snowflake } = require("@theinternetfolks/snowflake")

const app = express();
app.use(express.json());
app.use(body_parser.json());

const mysql = require("mysql");

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "127.0.0.1",
  user: "root",
//   password: "root",
  database: "communityData",
});


const port = 3000;

const server = app.listen(port,() =>{
    console.log("app is listening to port ", server.address().port);
});

function encryptPass(pass) {
    const hash = bcrypt.hashSync(pass, saltRounds);
    return hash;
}


app.get("/test",(req,res) =>{
    res.send("app is testing...")
});

app.post("/v1/role", (req,res) =>{
    let name = req.body.name;
    if(name.length < 2){
        res.send("Name must be greater than one digits");
    }
    else{
        try{    
            name = '"' + name + '"';
            pool.query(`insert into test(name) values(${name})`,
            (err,result) =>{
                if(err){
                    res.send(err);
                }else{
                    res.status(200).send("Role is inserted successfully");
                }
            });
        }catch(err){
            res.send(err);
        }
    }
});

app.get("/v1/role", (req,res) =>{
    try{
        pool.query(`select * from test`, (err,result) =>{
            if(err) res.send(err);
            else{
                console.log("Result is", result)
                res.send(result);
            }
        });
    }
    catch(err){
        res.send(err);
    }
});


app.post("/v1/auth/signup", (req,res) => {
    let name = req.body.name;
    if(name.length < 2) res.send("Name must be of greater than one character");
    let email = req.body.email;
    if(email.length < 10) res.send("Email is required")
    let password = req.body.password;
    if(password.length < 6) res.send("Password must be of greater than six character")
    let passwordToStore = encryptPass(password);
    name = '"' + name + '"';
    email =  '"' + email + '"';
    passwordToStore = '"' + passwordToStore + '"';
    let id = Snowflake.generate();
    id = '"' + id + '"';
    try{
        pool.query(`insert into users(id, name, email, password) values(${id}, ${name}, ${email}, ${passwordToStore})`,
        (err,result)=>{
            if(err) res.send(err);
            else{
                res.send("You are signUp successfully");
            }
        });
    }catch(err){
        res.send(err);
    }
});

app.post("/v1/auth/signin", (req,res) => {
    let email = req.body.email;
    let password =  req.body.password;
    !email ? res.send("Enter email...") : password ? "" :  res.send("Enter Password...")
    try{
        email = '"' + email + '"';
        pool.query(`select password from users where email=${email}`, (err,result)=>{
            if(err) res.send(err);
            if(!result) return res.send("Not a registered employee...");
            else if(bcrypt.compareSync(password, result[0].password)){
                const token = jwt.sign( { email }, jwt_key, {
                    algorithm: "HS256",
                    expiresIn: jwtExpiryTime
                })
                res.send(token);
            }
            else return res.send("Password does not match...");
            })
    }catch(err){
        res.send("Login failed...");
    }
});

app.get("/v1/auth/me",(req,res) =>{
    const token = req.headers["authorization"];
    try{
        if(!token){
            return res.send("Please signin first...")
        }
        else{
            let varification = jwt.verify(token, jwt_key);
            console.log(varification.email);
            pool.query(`select name from users where email = ${varification.email}`, (err,result) => {
                if(err) return res.send(err);
                else{
                    let userDetails = {};
                    userDetails.name = result[0].name;
                    userDetails.email = JSON.parse(varification.email);
                    return res.send(userDetails);
                }
            });
            }
        }catch(err){
            res.send(err);
        }
});

app.post("/v1/comunity", (req,res) =>{
    let name = req.body.name;
    if(!name || name.length < 2 ) return res.send("name must be grater than one character");
    name = '"' + name + '"';
    const token = req.headers["authorization"];
    let id = Snowflake.generate();
    id = '"' + id + '"';
    const memberId = Snowflake.generate();
    let varification = jwt.verify(token, jwt_key);
    let userid = "";
    let createdDate = new Date();
    try{
        pool.query(`select id from users where email = ${varification.email}`, (err,result) =>{
            if(err) return res.send(err);
            else{
                userid = result[0].id;
                userid = '"' + userid + '"';
            }
        })
        pool.query(`insert into community(id, name, slag, owner, createdAt, updatedAt) values(${id}, ${name}, ${name}, ${userid},${createdDate},${createdDate})`,(err,result) =>{
            if(err) return res.send(err);
            else{
                pool.query(`insert into member(id,community,user,role,createdAt) values(${memberId},${id},${userid},"admin", ${createdDate})`);
            }
        });
    }catch(err){
        return res.send(err);
    }
});

app.get("/v1/community", (req,res)=>{
    try{
        pool.query(`select owner, id, name from community`, (err,result) =>{
            if(err) return res.send(err);
            else{
                return res.send(result);
            }
        });
    }catch(err){
        return res.send(err);
    }
})


app.get("/v1/community/:id/members", (req,res)=>{
    let id = req.params.id;
    id = '"' + d + '"';
    try{
        pool.query(`SELECT name,id,role from members where id = ${id};`,(err,result)=>{
            if(err) return res.send(err);
            else{
                return res.send(result);
            }
        })
    }catch(err){
        return res.send(err);
    }
});

app.get("/v1/community/me/owner", (req,res)=>{
    const token = req.headers["authorization"];
    if(!token) return res.send("Signin first");
    else{
        try{
            let varification = jwt.verify(token, jwt_key);
            let userId = "";
            pool.query(`select id from users where email = ${varification.email}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userId = result[0].id;
                }
            });
            pool.query(`select * from community where owner = ${userId}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    return res.send(result);
                }
            })
        }catch(err){
            res.send(err);
        }
    }
});

app.get("/v1/community/me/member", (req,res) =>{
    const token = req.headers["authorization"];
    if(!token) return res.send("Signin first");
    else{
        try{
            let varification = jwt.verify(token, jwt_key);
            let userId = "";
            pool.query(`select id from users where email = ${varification.email}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userId = result[0].id;
                }
            });
            pool.query(`select id, name from member where user = ${userId}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    return res.send(result);
                }
            });
        }catch(err){
            return res.send(err);
        }
    }
});


app.post("",(req,res)=>{
    const token = req.headers["authorization"];
    let comId = req.body.community;
    let role = req.body.role;
    let user = req.body.user;
    let createdDate = new Date();
    if(!token) return res.send("Signin first");
    else{
        try{
            let varification = jwt.verify(token, jwt_key);
            let userId = "";
            let userRole = ""
            pool.query(`select id from users where email = ${varification.email}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userId = result[0].id;
                }
            });
            pool.query(`select role from member where user = ${userId} and community = ${comId}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userRole = result[0].role;
                }
            })
            if(userRole != "admin") return res.send("NOT_ALLOWED_ACCESS");
            else{
                pool.query(`insert into member(id,community,user,role,createdAt) values(${memberId},${id},${user},${role}, ${createdDate})`,(err,result) =>{
                    if(err) return res.send(err);
                    else {
                        return res.send("Member is successfully added")
                    }
                })
            }
        }catch(err){
            return res.send(err);
        }
    }
});


app.delete("/v1/member/:id", (req,res) =>{
    const token = req.headers["authorization"];
    let user = req.params.id;
    if(!token) return res.send("Signin first");
    else{
        try{
            let varification = jwt.verify(token, jwt_key);
            let userId = "";
            let userRole = ""
            pool.query(`select id from users where email = ${varification.email}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userId = result[0].id;
                }
            });
            pool.query(`select role from member where user = ${userId} and community = ${comId}`, (err,result) =>{
                if(err) return res.send(err);
                else{
                    userRole = result[0].role;
                }
            })
            if(userRole != "admin") return res.send("NOT_ALLOWED_ACCESS");
            else{
                pool.query(`delete from member where user = ${user}`,(err,result) =>{
                    if(err) return res.send(err);
                    else{
                        return res.send("User is successfully deleted")
                    }
                })
            }
        }catch(err){
            return res.send(err);
        }
    }
});