package lk.sliit.it3030.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Resource {
    private String id;
    private String name;
    private String type;
    private String status;
    private int capacity;
    private String location;
    private String availability;
}
