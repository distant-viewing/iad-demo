library(jpeg)
library(png)

col <- as.numeric(col2rgb("#e4c8d4")) / 255
#col <- c(230, 237, 222) / 255
x <- readJPEG("bginput.jpg")

bw <- (x[,,1] + x[,,2] + x[,,3]) / 3
bw <- 1 - (1 - bw) * 0.3

img <- abind::abind(bw * col[1], bw * col[2], bw * col[3], along = 3L)
writeJPEG(img, "bg.jpg")
