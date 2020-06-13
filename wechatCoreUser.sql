SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for usermanar
-- ----------------------------
DROP TABLE IF EXISTS `usermanar`;
CREATE TABLE `usermanar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `weshoporder` varchar(255) DEFAULT NULL,
  `clinekey` varchar(100) DEFAULT NULL,
  `domain` varchar(100) DEFAULT NULL,
  `ip` varchar(50) DEFAULT NULL,
  `devcount` tinyint(3) DEFAULT NULL,
  `sendimg` tinyint(4) DEFAULT NULL,
  `sendcard` tinyint(4) DEFAULT NULL,
  `process` tinyint(2) DEFAULT NULL,
  `scan` tinyint(1) DEFAULT NULL,
  `maxsendcount` int(10) DEFAULT NULL,
  `endtime` int(11) DEFAULT NULL,
  `cost` decimal(6,2) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `addtime` int(11) DEFAULT NULL,
  `webname` varchar(255) DEFAULT NULL,
  `sendok` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of usermanar
-- ----------------------------
INSERT INTO `usermanar` VALUES ('8', '201907251753QUZNF6HDNHD4X', '1d68f560-e8a0-11e9-86b5-594b2e4de00a', 'https://www.test.com', '127.0.0.1', '100', '100', '15', '100', '1', '1000', '1570501800', '500.00', '1', '1572246285', '测试站点', '2');
