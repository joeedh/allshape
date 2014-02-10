-- phpMyAdmin SQL Dump
-- version 3.4.10.1deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Jan 19, 2014 at 03:26 PM
-- Server version: 5.5.34
-- PHP Version: 5.3.10-1ubuntu3.9

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `allshape`
--

-- --------------------------------------------------------

--
-- Table structure for table `authtokens`
--

CREATE TABLE IF NOT EXISTS `authtokens` (
  `tokenid` varchar(255) NOT NULL,
  `userid` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `permissions` int(11) NOT NULL,
  `expiration` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `uploadtokens` (
  `tokenid` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `time` datetime NOT NULL,
  `fileid` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `realpath` varchar(255) NOT NULL,
  `userid` int(11) NOT NULL,
  `permissions` int(11) NOT NULL,  
  `expiration` datetime NOT NULL,
  `size` bigint NOT NULL,
  `cur` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `filedata`
--

CREATE TABLE IF NOT EXISTS `filedata` (
  `fileid` int(11) NOT NULL AUTO_INCREMENT,
  `parentid` int(11) NOT NULL,
  `name` varchar(512) NOT NULL,
  `mimeType` varchar(255) NOT NULL,
  `other_meta` text NOT NULL,
  `userid` int(11) NOT NULL,
  `diskpath` varchar(512) NOT NULL,
  PRIMARY KEY (`fileid`),
  KEY `parentid` (`parentid`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=4 ;

-- make dummy file record for root directory ID
INSERT INTO filedata (userid) VALUES(0) ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `userid` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `name_last` varchar(255) NOT NULL,
  `name_first` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `permissions` int(11) NOT NULL,
  `last_login` datetime NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=2 ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
