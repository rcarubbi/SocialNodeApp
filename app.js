var express = require('express'),
    app = express(),
    nodemailer = require('nodemailer'),
    MemoryStore = require('connect').session.MemoryStore,
    dbpath = 'mongodb://localhost/nodebackbone',
    mongoose = require('mongoose'),
    config = {
        mail: require('./config/mail')
    },
    models = {
        Account: require('./models/Account')(config, mongoose, nodemailer)
    };
    

app.configure(function () {
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
    app.use(express.limit('1mb'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: "SocialNet secret key", store: new MemoryStore()}));
    mongoose.connect(dbpath, function onMongooseError (err) {
        if (err) throw err;
    });
});

app.get('/', function (req, res) {
    res.render("index.jade");
});


app.post('/login', function (req, res) {
    console.log('login request');
    var email = req.param('email', null),
        password = req.param('password', null);

    if (null == email || email.length < 1 || null == password || password.length < 1) {
        res.send(400);
        return;
    }

    models.Account.login(email, password, function (account) {
        if (!account) {
            res.send(401);
            return;
        }
        console.log('login was successful');
        req.session.loggedIn = true;
        req.session.accountId = account._id;
        res.send(200);
    });
});

app.post('/register', function (req, res) {
    var firstName = req.param('firstName', ''),
        lastName = req.param('lastName', ''),
        email = req.param('email', null),
        password = req.param('password', null);

    console.log(req.params);

    if (null == email || null == password) {
        res.send(400);
        return;
    }
    models.Account.register(email, password, firstName, lastName);
    res.send(200);
});

app.get('/account/authenticated', function (req, res) {
    if (req.session.loggedIn) {
        res.send(200);
    } else {
        res.send(401);
    }
});

app.get('/accounts/:id/activity', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id;
    models.Account.findById(accountId, function (account) {
        res.send(account.activity);
    });
});

app.get('/accounts/:id/status', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id;
    models.Account.findById(accountId, function (account) {
        res.send(account.status);
    });
});

app.post('/accounts/:id/status', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id;
    models.Account.findById(accountId, function (account) {
        status = {
            name: account.name,
            status: req.params('status', '')
        };
        account.status.push(status);

        //Envia o status para todos os amigos
        account.activity.push(status);
        account.save(function (err) {
            if (err) {
                console.log('Error saving account:' + err);
            }
        });
    });
    req.send(200);
});

app.get('/accounts/:id', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id;
    models.Account.findById(accountId, function (account) {
        res.send(account);
    });
});

app.post('/forgotpassword', function (req, res) {
    var hostname = req.headers.host,
        resetPasswordUrl = 'http://' + hostname + '/resetPassword',
        email = req.param('email', null);

    if (null == email || email.length < 1) {
        res.send(401);
        return;
    }

    models.Account.forgotPassword(email, resetPasswordUrl, function (success, err) {
        if (success) {
            res.send(200);
        } else {
            console.log(err);
            res.send(404);
        }
    });
});

app.get('/resetPassword', function(req, res) {
    var accountId = req.param('account', null);
    res.render('resetPassword.jade', {
         
            accountId: accountId
         
    });
});


app.post('/resetPassword', function (req, res) {
    var accountId = req.param('accountId', null),
        password = req.param('password', null);

    if (null != accountId && null != password) {
        models.Account.changePassword(accountId, password);
    }
    res.render('resetPasswordSuccess.jade');
});

app.get('/accounts/:id/contacts', function (req, res) {
    var accountId = req.params.id = 'me'
                    ? req.session.accountId
                    : req.params.id;
    models.Account.findById(accountId, function (account) {
        res.send(account.contacts);
    });
});

app.post('/contacts/find', function (req, res) {
    var searchStr = req.param('searchStr', null);
    if (null == searchStr) {
        res.send(400);
        return;
    }
    models.Account.findByString(searchStr, function onSearchDone(err, accounts) {
        if (err || accounts.length == 0) {
            res.send(404);
        } else {
            res.send(accounts);
        }
    });
});

app.post('/accounts/:id/contact', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id,
        contactId = req.param('contactId', null);

    // contactId faltante, não se importe em prosseguir
    if (null == contactId) {
        res.send(400);
        return;
    }

    models.Account.findById(accountId, function (account) {
        if (account) {
            models.Account.findById(contactId, function (contact) {    
                models.Account.addContact(account, contact);

                // faz o link inverso
                models.Account.addContact(contact, account);
                account.save();
            });
        }
    });
    // Nota: não em callback - este ponto de extremidade retorna imediatamente e 
    // é processado em segundo plano
    res.send(200);
});


app.delete('/accounts/:id/contact', function (req, res) {
    var accountId = req.params.id == 'me'
                    ? req.session.accountId
                    : req.params.id,
        contactId = req.param('contactId', null);

    // contactId faltante, não se importe em prosseguir
    if (null == contactId) {
        res.send(400);
        return;
    }

    models.Account.findById(accountId, function (account) {
        if (!account) return;

        models.Account.findById(contactId, function (contact, err) {
            if (!contact) return;

            models.Account.removeContact(account, contactId);

            // Encerra o link inverso
            models.Account.removeContact(contact, accountId);
        });
    });

    // Nota: não em callback - este ponto de extremidade retorna imediatamente e 
    // é processado em segundo plano
    res.send(200);
});
app.listen(8080);
console.log('Listening on port 8080');