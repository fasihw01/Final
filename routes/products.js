const {Product} = require('../models/product');
const express = require('express');
const { Category } = require('../models/category');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
  });

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
       public_id: (req, file) => file.originalname.split(' ').join('-'),
       // Optional: Specify the folder in your Cloudinary account where you want to store the images
      allowedFormats: ['png', 'jpg','jpeg'], // Replace 'png' with the desired image format or remove this line to keep the original format
    },
  });
  const uploadOptions = multer({ storage: storage });

router.get(`/`, async (req, res) =>{
    let filter = {};
    if(req.query.categories)
    {
         filter = {category: req.query.categories.split(',')}
    }

    const productList = await Product.find(filter).populate('category');

    if(!productList) {
        res.status(500).json({success: false})
    } 
    res.send(productList);
})

router.get(`/:id`, async (req, res) =>{
    const product = await Product.findById(req.params.id).populate('category');

    if(!product) {
        res.status(500).json({success: false})
    } 
    res.send(product);
})

router.post(`/`, uploadOptions.single('image'), async (req, res) =>{
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category')

    const file = req.file;
    if(!file) return res.status(400).send('No image in the request')

    const fileName = file.filename
    //const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    const result = await cloudinary.uploader.upload(file.path, {
        folder: '/public/images', // Optional: Specify the folder in your Cloudinary account where you want to store the images
        allowed_formats: ['png', 'jpg', 'jpeg'], // Replace 'png' with the desired image format or remove this line to keep the original format
        public_id: file.originalname.split(' ').join('-'),
      });
    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${result.secure_url}`,// "http://localhost:3000/public/upload/image-2323232"
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
    })

    product = await product.save();

    if(!product) 
    return res.status(500).send('The product cannot be created')

    res.send(product);
})

router.patch('/:id', uploadOptions.single('image'),async (req, res)=> {
    if(!mongoose.isValidObjectId(req.params.id)) {
       return res.status(400).send('Invalid Product Id')
    }
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category');
    
//     const file = req.file;
//     if(!file) return res.status(400).send('No image in the request')

//     const fileName = file.filename
//     //const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
//     const result = await cloudinary.uploader.upload(file.path, {
//         folder: '/public/images', // Optional: Specify the folder in your Cloudinary account where you want to store the images
//         allowed_formats: ['png', 'jpg', 'jpeg'], // Replace 'png' with the desired image format or remove this line to keep the original format
//         public_id: file.originalname.split(' ').join('-'),
//       });

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
//         {
//             name: req.body.name,
//             description: req.body.description,
//             richDescription: req.body.richDescription,
//             image: `${result.secure_url}`,
//             brand: req.body.brand,
//             price: req.body.price,
//             category: req.body.category,
//             countInStock: req.body.countInStock,
//             rating: req.body.rating,
//             numReviews: req.body.numReviews,
//             isFeatured: req.body.isFeatured,
//         },
        { new: true}
    )

    if(!product)
    return res.status(500).send('the product cannot be updated!')

    res.send(product);
})

router.delete('/:id', (req, res)=>{
    Product.findByIdAndRemove(req.params.id).then(product =>{
        if(product) {
            return res.status(200).json({success: true, message: 'the product is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "product not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

router.get(`/get/count`, async (req, res) =>{
    const productCount = await Product.countDocuments((count) => count)

    if(!productCount) {
        res.status(500).json({success: false})
    } 
    res.send({
        productCount: productCount
    });
})

router.get(`/get/featured/:count`, async (req, res) =>{
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({isFeatured: true}).limit(+count);

    if(!products) {
        res.status(500).json({success: false})
    } 
    res.send(products);
})

router.patch(
    '/gallery-images/:id', 
    uploadOptions.array('images', 10), 
    async (req, res)=> {
        if(!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id')
         }
         const files = req.files
         let imagesPaths = [];
         const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

         if (files) {
            for (const file of files) {
              try {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: '/public/images', // Optional: Specify the folder in your Cloudinary account where you want to store the images
                  allowed_formats: ['png', 'jpg', 'jpeg'], // Replace 'png' with the desired image format or remove this line to keep the original format
                  public_id: file.originalname.split(' ').join('-'),
                });
                imagesPaths.push(result.secure_url);
              } catch (error) {
                // Handle any error that occurred during image upload
                return res.status(500).send('Failed to upload one or more images');
              }
            }
          }

         const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths
            },
            { new: true}
        )

        if(!product)
            return res.status(500).send('the gallery cannot be updated!')

        res.send(product);
    }
)

module.exports =router;
