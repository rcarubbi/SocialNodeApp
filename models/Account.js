module.exports = function (config, mongoose, nodemailer) {
    var crypto = require('crypto'),
        Status = new mongoose.Schema({
            name: {
                first: {type: String},
                last: {type: String}
            },
            status: {type: String}
        }),
        AccountSchema = new mongoose.Schema({
            email: {type: String, unique: true},
            password: {type: String},
            name: {
                first: {type: String},
                last: {type: String}
            },
            birthday: {
                day: {type: Number, min: 1, max: 31, required: false},
                month: {type: Number, min: 1, max: 12, required: false},
                year: {type: Number }
            },
            photoUrl: { type: String },
            biography: {type: String},
            status: [Status], // Apenas minhas próprias atualizações de status
            activity: [Status] // Todas as atualizações de status, incluindo amigos
        }),
        Account = mongoose.model('Account', AccountSchema),
        registerCallback = function (err) {
            if (err) {
                return console.log(err);
            }

            return console.log('Account was created');
        },
        changePassword = function (accountId, newPassword) {
            var shaSum = crypto.createHash('sha256');
            shaSum.update(newPassword);
            var hashedPassword = shaSum.digest('hex');
            Account.update({_id: accountId}, {$set: {password: hashedPassword}}, {upsert: false}, function changePasswordCallback(err) {
                console.log('Change password done for account ' + accountId);
            });
        },
        forgotPassword = function (email, resetPasswordUrl, callback) {
            var user = Account.findOne({email: email}, function findAccount(err, doc) {
                if (err) {
                    //endereço de email não é de um usuário valido
                    callback(false, null);
                } else {
                    var smtpTransport = nodemailer.createTransport('SMTP', config.mail);
                    resetPasswordUrl += '?account=' + doc._id;
                    
                    smtpTransport.sendMail({
                        from: 'thisapp@example.com',
                        to: doc.email,
                        subject: 'SocialNet Password Request',
                        text: 'Click here to reset your password ' + resetPasswordUrl
                    }, function forgotPasswordResult(err) {
                        if (err) {
                            callback(false, err);
                        } else {
                            callback(true, err);
                        }
                    });
                }
            });
        },
        login = function (email, password, callback) {
            var shaSum = crypto.createHash('sha256');
            shaSum.update(password);
            Account.findOne({email: email, password: shaSum.digest('hex')}, function (err, doc) {
                callback(null !== doc);
            });
        },
        findById = function (accountId, callback) {
            Account.findOne({_id: accountId}, function (err, doc) {
                callback(doc);
            });
        },
        findByString = function (searchStr, callback) {
            var searchRegex = new RegExp(searchStr, 'i');
            Account.find({
                $or: [
                    {'name.full': {$regex: searchRegex}},
                    {email: {$regex: searchRegex}}
                ]
            }, callback);
        },
        addContact = function (account, addcontact) {
            contact = {
                name: addcontact.name,
                accountId: addcontact._id,
                added: new Date(),
                updated: new Date()
            };
            account.contacts.push(contact);

            account.save(function (err) {
                if (err) {
                    console.log('Error saving account: ' + err);
                }
            });
        },
        removeContact = function (account, contactId) {
            if (null = account.contacts) return;

            account.contacts.forEach(function (contact) {
                if (contact.accountId == contactId) {
                    account.contacts.remove(contact);
                }
            });
            account.save();
        },
        register = function (email, password, firstName, lastName) {
            var shaSum = crypto.createHash('sha256');
            shaSum.update(password);
            console.log('Registering ' + email);
            var user = new Account({
                email: email,
                name: {
                    first: firstName,
                    last: lastName
                },
                password: shaSum.digest('hex')
            });
            user.save(registerCallback);
            console.log('Save command was sent');
        };
    return {
        removeContact: removeContact,
        addContact: addContact,
        findById: findById,
        findByString: findByString,
        register: register,
        changePassword: changePassword,
        forgotPassword: forgotPassword,
        login: login,
        Account: Account
    };
};