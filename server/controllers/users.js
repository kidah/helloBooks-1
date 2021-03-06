import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import { User, Book } from '../models';
import { getJWT } from '../helpers/helpers';

dotenv.config();


export default {
  /**
   * Create new user account.
   * It sends a an object containing a success boolean
   * and a json web token or error
   * @public
   * @method
   * @param  {object} req - express http request object
   * @param  {object} res - express http response object
   * @return {undefined}
   */

  createUser(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    return User.find({
      where: { $or: [{ username }, { email }] }
    }).then((existingUser) => {
      if (existingUser && existingUser.username === username) {
        res.status(409).json({
          success: false,
          message: 'username is taken',
        });
        return;
      }
      if (existingUser && existingUser.email === email) {
        res.status(409).json({
          success: false,
          message: 'email is associated with an account',
        });
        return;
      }
      User.create(req.body)
        .then((user) => {
          const token = getJWT(
            user.id,
            user.username,
            user.email,
            user.isAdmin,
          );
          res.status(201).json({ success: true, token });
        })
        .catch(error => res.status(400).send({
          success: false,
          error
        }));
    })
      .catch(error => res.status(500).send({
        success: false,
        error
      }));
  },
  /**
   * Get user data on sign in.
   * It sends a an object containing a success boolean
   * and a json web token or error
   * @public
   * @method
   * @param  {object} req - express http request object
   * @param  {object} res - express http response object
   * @return {undefined}
   */

  getUser(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    return User.findOne({ where: { username } }).then((user) => {
      if (!user) {
        res.status(400).send({
          success: false,
          message: 'user does not exist',
        });
        return;
      }
      bcrypt.compare(password, user.password).then((result) => {
        if (!result) {
          res.status(400).send({
            success: false,
            message: 'wrong username and password combination',
          });
        } else {
          const token = getJWT(
            user.id,
            user.username,
            user.email,
            user.isAdmin
          );
          res.status(200).json({ success: true, token });
        }
      }).catch(error => res.status(500).send({
        success: false,
        error,
      }));
    }).catch(error => res.status(400).send({
      success: false,
      error,
    }));
  },

  /**
   * Get list of books borrowed by specific user
   * It sends a an object containing a success boolean
   * and a data key, an array of borrowed books or an error
   * Response can be filtered by returned status
   * @public
   * @method
   * @param  {object} req - express http request object
   * @param  {object} res - express http response object
   * @return {undefined}
   */
  getBorrowedBooks(req, res) {
    const id = req.params.id;
    User.findOne({
      where: { id },
      include: [{ model: Book }]
    }).then((user) => {
      let books;
      if (req.query && req.query.returned === 'false') {
        books = user.Books.filter(
          book => book.BorrowedBook.returned === false
        );
      } else if (req.query && req.query.returned === 'true') {
        books = user.Books.filter(
          book => book.BorrowedBook.returned === true
        );
      } else {
        books = user.Books;
      }
      res.status(200).send({
        success: true,
        data: books
      });
    })
      .catch(error => res.status(500).send({
        success: false,
        message: 'An error occured while fetching borrowing history',
        error,
      }));
  },
};
